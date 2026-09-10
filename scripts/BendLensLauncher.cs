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

                // Resolve project root
                if (!File.Exists(Path.Combine(projectDir, "package.json")))
                {
                    string localAppDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "BendLens");
                    if (File.Exists(Path.Combine(localAppDataDir, "package.json")))
                    {
                        projectDir = localAppDataDir;
                    }
                    else if (Directory.Exists(@"D:\BCBUZZ_Side_Project\data-project"))
                    {
                        projectDir = @"D:\BCBUZZ_Side_Project\data-project";
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
                // Ensure desktop shortcut
                EnsureShortcutInBackground(exeDir, projectDir);

                // Smart launch: use production 'start' if build exists, otherwise 'dev'
                bool hasBuild = Directory.Exists(Path.Combine(projectDir, ".next"));
                string scriptCmd = hasBuild ? "npm run start" : "npm run dev";

                if (!IsServerRunning(AppUrl))
                {
                    ProcessStartInfo serverPsi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c " + scriptCmd,
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

                // Open default browser
                Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true });
            }
            catch (Exception)
            {
                try { Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true }); } catch { }
            }
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
