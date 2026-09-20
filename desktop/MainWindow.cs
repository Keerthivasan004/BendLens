using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace BendLens.Desktop
{
    public class MainWindow : Form
    {
        private WebView2? _webView;
        private Panel? _splashPanel;
        private Label? _statusLabel;
        private Process? _serverProcess;
        private int _activePort = 3000;
        private readonly int[] _portCandidates = { 3000, 3001, 3030, 8000, 5000 };
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromMilliseconds(800) };

        public MainWindow()
        {
            InitializeWindow();
            InitializeSplash();
            this.Shown += async (s, e) => await InitializeEngineAndBrowserAsync();
            this.FormClosing += MainWindow_FormClosing;
        }

        private void InitializeWindow()
        {
            this.Text = "BendLens — Backend Architecture & Blast-Radius Studio";
            this.Width = 1380;
            this.Height = 920;
            this.MinimumSize = new Size(1024, 700);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = ColorTranslator.FromHtml("#020617");

            string iconPath = ResolveIconPath();
            if (File.Exists(iconPath))
            {
                try
                {
                    this.Icon = new Icon(iconPath);
                }
                catch { }
            }
        }

        private static string ResolveIconPath()
        {
            string baseDir = AppContext.BaseDirectory;
            string[] candidates = {
                Path.Combine(baseDir, "public", "icon.ico"),
                Path.Combine(baseDir, "..", "public", "icon.ico"),
                Path.Combine(baseDir, "..", "..", "..", "public", "icon.ico"),
                Path.Combine(Directory.GetCurrentDirectory(), "public", "icon.ico")
            };

            foreach (string candidate in candidates)
            {
                string full = Path.GetFullPath(candidate);
                if (File.Exists(full)) return full;
            }

            return Path.Combine(baseDir, "icon.ico");
        }

        private void InitializeSplash()
        {
            _splashPanel = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = ColorTranslator.FromHtml("#020617")
            };

            var logoBox = new PictureBox
            {
                Size = new Size(72, 72),
                SizeMode = PictureBoxSizeMode.Zoom,
                BackColor = Color.Transparent
            };

            string iconPath = ResolveIconPath();
            if (File.Exists(iconPath))
            {
                try { logoBox.Image = new Icon(iconPath, 64, 64).ToBitmap(); } catch { }
            }

            var titleLabel = new Label
            {
                Text = "BendLens Studio",
                Font = new Font("Segoe UI", 18, FontStyle.Bold),
                ForeColor = Color.White,
                AutoSize = true,
                BackColor = Color.Transparent
            };

            _statusLabel = new Label
            {
                Text = "Initializing local architecture engine...",
                Font = new Font("Segoe UI", 10, FontStyle.Regular),
                ForeColor = ColorTranslator.FromHtml("#94a3b8"),
                AutoSize = true,
                BackColor = Color.Transparent
            };

            _splashPanel.Resize += (s, e) =>
            {
                int centerX = _splashPanel.Width / 2;
                int centerY = _splashPanel.Height / 2;

                logoBox.Location = new Point(centerX - (logoBox.Width / 2), centerY - 80);
                titleLabel.Location = new Point(centerX - (titleLabel.Width / 2), centerY + 5);
                _statusLabel.Location = new Point(centerX - (_statusLabel.Width / 2), centerY + 45);
            };

            _splashPanel.Controls.Add(logoBox);
            _splashPanel.Controls.Add(titleLabel);
            _splashPanel.Controls.Add(_statusLabel);

            this.Controls.Add(_splashPanel);
        }

        private async Task InitializeEngineAndBrowserAsync()
        {
            UpdateStatus("Checking for existing BendLens engine...");
            string projectDir = ResolveProjectDir();

            // 1. Resolve free or matching BendLens port
            _activePort = await ResolvePortAsync();

            // 2. Start backend server if not already running on port
            bool isAlreadyRunning = await IsBendLensEngineRunningAsync(_activePort);
            if (!isAlreadyRunning)
            {
                UpdateStatus($"Starting local engine on port {_activePort}...");
                StartBackendServer(projectDir, _activePort);
            }

            // 3. Initialize WebView2
            UpdateStatus("Connecting to Studio workspace...");
            await InitializeWebView2Async();

            // 4. Wait for local server to become healthy
            bool ready = await WaitForServerReadyAsync(_activePort, TimeSpan.FromSeconds(45));
            if (!ready)
            {
                MessageBox.Show(
                    $"BendLens local engine did not respond in time on port {_activePort}.\n\nPlease restart the application.",
                    "Engine Startup Timeout",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
                return;
            }

            // 5. Navigate to Studio and reveal WebView2
            if (_webView != null && _webView.CoreWebView2 != null)
            {
                _webView.CoreWebView2.Navigate($"http://127.0.0.1:{_activePort}");
                if (_splashPanel != null)
                {
                    await Task.Delay(300);
                    _splashPanel.Visible = false;
                }
            }
        }

        private async Task InitializeWebView2Async()
        {
            _webView = new WebView2
            {
                Dock = DockStyle.Fill,
                DefaultBackgroundColor = ColorTranslator.FromHtml("#020617")
            };

            this.Controls.Add(_webView);
            this.Controls.SetChildIndex(_webView, 0); // Behind splash until loaded

            string userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "BendLens",
                "WebView2Data");

            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await _webView.EnsureCoreWebView2Async(env);

            _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _webView.CoreWebView2.Settings.AreDevToolsEnabled = true;

            // Intercept external links to open in the system default browser
            _webView.CoreWebView2.NewWindowRequested += (sender, args) =>
            {
                if (Uri.TryCreate(args.Uri, UriKind.Absolute, out Uri? uri))
                {
                    if (uri.Host != "127.0.0.1" && uri.Host != "localhost")
                    {
                        args.Handled = true;
                        try
                        {
                            Process.Start(new ProcessStartInfo(args.Uri) { UseShellExecute = true });
                        }
                        catch { }
                    }
                }
            };
        }

        private static string ResolveProjectDir()
        {
            string baseDir = AppContext.BaseDirectory;
            string[] candidates = {
                Path.Combine(baseDir, ".next", "standalone"),
                baseDir,
                Path.Combine(baseDir, ".."),
                Path.Combine(baseDir, "..", "..", ".."),
                Directory.GetCurrentDirectory()
            };

            foreach (string candidate in candidates)
            {
                string full = Path.GetFullPath(candidate);
                if (File.Exists(Path.Combine(full, "package.json")) || File.Exists(Path.Combine(full, "server.js")))
                {
                    return full;
                }
            }

            return baseDir;
        }

        private async Task<int> ResolvePortAsync()
        {
            foreach (int port in _portCandidates)
            {
                if (await IsBendLensEngineRunningAsync(port))
                {
                    return port;
                }

                if (IsPortAvailable(port))
                {
                    return port;
                }
            }

            return 3000;
        }

        private static async Task<bool> IsBendLensEngineRunningAsync(int port)
        {
            try
            {
                var res = await _httpClient.GetAsync($"http://127.0.0.1:{port}/api/updates/check");
                if (res.IsSuccessStatusCode)
                {
                    string content = await res.Content.ReadAsStringAsync();
                    return content.Contains("\"success\":true");
                }
            }
            catch { }
            return false;
        }

        private static bool IsPortAvailable(int port)
        {
            try
            {
                using var tcp = new TcpClient();
                var ar = tcp.BeginConnect("127.0.0.1", port, null, null);
                bool connected = ar.AsyncWaitHandle.WaitOne(200);
                if (connected && tcp.Connected)
                {
                    tcp.EndConnect(ar);
                    return false; // Port is in use
                }
                return true;
            }
            catch
            {
                return true;
            }
        }

        private void StartBackendServer(string projectDir, int port)
        {
            try
            {
                string standaloneServer = Path.Combine(projectDir, "server.js");
                string runnerScript = Path.Combine(projectDir, "electron", "server-runner.js");

                var psi = new ProcessStartInfo
                {
                    WorkingDirectory = projectDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                psi.EnvironmentVariables["PORT"] = port.ToString();
                psi.EnvironmentVariables["BENDLENS_APP_DIR"] = projectDir;
                psi.EnvironmentVariables["NODE_ENV"] = "production";

                if (File.Exists(standaloneServer))
                {
                    psi.FileName = "node.exe";
                    psi.Arguments = $"\"{standaloneServer}\"";
                }
                else if (File.Exists(runnerScript))
                {
                    psi.FileName = "node.exe";
                    psi.Arguments = $"\"{runnerScript}\"";
                }
                else
                {
                    psi.FileName = "cmd.exe";
                    psi.Arguments = $"/c npm run start -- -p {port}";
                }

                _serverProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[Backend] Failed to spawn: {ex.Message}");
            }
        }

        private static async Task<bool> WaitForServerReadyAsync(int port, TimeSpan timeout)
        {
            var sw = Stopwatch.StartNew();
            while (sw.Elapsed < timeout)
            {
                if (await IsBendLensEngineRunningAsync(port)) return true;
                await Task.Delay(250);
            }
            return false;
        }

        private void UpdateStatus(string message)
        {
            if (_statusLabel != null && !this.IsDisposed)
            {
                if (this.InvokeRequired)
                {
                    this.BeginInvoke(new Action(() => UpdateStatus(message)));
                    return;
                }
                _statusLabel.Text = message;
                _splashPanel?.PerformLayout();
            }
        }

        private void MainWindow_FormClosing(object? sender, FormClosingEventArgs e)
        {
            if (_serverProcess != null && !_serverProcess.HasExited)
            {
                try
                {
                    _serverProcess.Kill(true); // Kill process tree cleanly
                }
                catch { }
            }
        }
    }
}
