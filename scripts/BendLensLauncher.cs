using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace BendLensDesktop
{
    static class Program
    {
        private const int Port = 3000;
        private const string AppUrl = "http://127.0.0.1:3000";

        [STAThread]
        static void Main()
        {
            try
            {
                string exeDir = AppDomain.CurrentDomain.BaseDirectory;
                string projectDir = exeDir;

                // Resolve installed project root (portable dir -> LocalAppData -> Program Files).
                // NOTE: never fall back to a developer machine path — this binary ships to users.
                if (!File.Exists(Path.Combine(projectDir, "package.json")))
                {
                    string localAppDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "BendLens");
                    if (File.Exists(Path.Combine(localAppDataDir, "package.json")))
                    {
                        projectDir = localAppDataDir;
                    }
                    else
                    {
                        string programFilesDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "BendLens");
                        if (File.Exists(Path.Combine(programFilesDir, "package.json")))
                        {
                            projectDir = programFilesDir;
                        }
                    }
                }

                // 1. Check if native Electron runtime is present
                string electronLocal = Path.Combine(projectDir, "node_modules", "electron", "dist", "electron.exe");

                if (File.Exists(electronLocal))
                {
                    // ZERO-LATENCY LAUNCH:
                    // Launch Electron immediately (<150ms). Electron will instantly display 
                    // the embedded splash screen and manage backend engine initialization concurrently.
                    ProcessStartInfo electronPsi = new ProcessStartInfo
                    {
                        FileName = electronLocal,
                        Arguments = ".",
                        WorkingDirectory = projectDir,
                        UseShellExecute = false
                    };
                    Process.Start(electronPsi);

                    // Ensure Desktop Shortcut exists in background
                    EnsureShortcutInBackground(exeDir, projectDir);
                    return;
                }

                // 2. Fallback Web Mode (if Electron is not installed):
                // Requires the installed runtime (package.json + node_modules + production
                // build) and Node.js on PATH. Never opens a dead localhost tab.
                EnsureShortcutInBackground(exeDir, projectDir);

                bool hasRuntime = File.Exists(Path.Combine(projectDir, "package.json"))
                    && Directory.Exists(Path.Combine(projectDir, "node_modules"));
                bool hasBuild = hasRuntime && Directory.Exists(Path.Combine(projectDir, ".next"));
                bool hasNode = IsCommandAvailable("node");

                if (!hasRuntime || !hasNode || !hasBuild)
                {
                    MessageBox.Show(
                        "BendLens Desktop runtime was not found on this machine.\n\n" +
                        "To scan local folders as a native app, install the full Desktop App:\n" +
                        "1. Download BendLens-Setup.exe from the BendLens website\n" +
                        "2. Run it once (installs the native studio + Desktop shortcut)\n" +
                        "3. Launch BendLens from your Desktop — no browser needed.",
                        "BendLens - Desktop Runtime Missing",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                if (!IsServerRunning(AppUrl))
                {
                    ProcessStartInfo serverPsi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c npm run start",
                        WorkingDirectory = projectDir,
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        UseShellExecute = false
                    };
                    Process.Start(serverPsi);
                }

                // Fast poll server readiness at 150ms intervals
                int attempts = 0;
                while (attempts < 40)
                {
                    Thread.Sleep(150);
                    if (IsServerRunning(AppUrl)) break;
                    attempts++;
                }

                if (IsServerRunning(AppUrl))
                {
                    // Engine is live — open it for the user
                    Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true });
                }
                else
                {
                    MessageBox.Show(
                        "The BendLens local engine did not start.\n\n" +
                        "Please make sure Node.js is installed, then try again. " +
                        "For a zero-setup experience, install BendLens-Setup.exe from the website.",
                        "BendLens - Engine Failed to Start",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "BendLens could not start.\n\n" + ex.Message,
                    "BendLens - Startup Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static bool IsCommandAvailable(string command)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c where " + command,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    UseShellExecute = false,
                    RedirectStandardOutput = true
                };
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(3000);
                    return p.ExitCode == 0;
                }
            }
            catch { return false; }
        }

        private static bool IsServerRunning(string url)
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Timeout = 500;
                request.Method = "GET";
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void EnsureShortcutInBackground(string exeDir, string projectDir)
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                    string shortcutPath = Path.Combine(desktopPath, "BendLens.lnk");

                    // If shortcut already exists, don't waste CPU/IO recreating it
                    if (File.Exists(shortcutPath)) return;

                    string iconPath = Path.Combine(projectDir, "public", "icon.ico");
                    if (!File.Exists(iconPath))
                    {
                        iconPath = Path.Combine(exeDir, "icon.ico");
                    }

                    Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                    if (shellType != null)
                    {
                        dynamic shell = Activator.CreateInstance(shellType);
                        dynamic shortcut = shell.CreateShortcut(shortcutPath);
                        shortcut.TargetPath = Path.Combine(exeDir, "BendLens.exe");
                        shortcut.WorkingDirectory = exeDir;
                        if (File.Exists(iconPath))
                        {
                            shortcut.IconLocation = iconPath;
                        }
                        shortcut.Description = "BendLens - Universal Backend Architecture & Blast Platform";
                        shortcut.Save();
                    }
                }
                catch { }
            });
        }
    }
}
