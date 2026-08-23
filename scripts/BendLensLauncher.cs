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
        private const string AppUrl = "http://localhost:3000";

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

                // Create Desktop Shortcut
                CreateDesktopShortcut(Path.Combine(exeDir, "BendLens.exe"));

                // If server is not running, start it in the background
                if (!IsServerRunning(AppUrl))
                {
                    ProcessStartInfo serverPsi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c npm run dev",
                        WorkingDirectory = projectDir,
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        UseShellExecute = false
                    };
                    Process.Start(serverPsi);
                }

                // Poll until server is ready
                int attempts = 0;
                while (attempts < 25)
                {
                    Thread.Sleep(400);
                    if (IsServerRunning(AppUrl)) break;
                    attempts++;
                }

                // Try to launch as a Native Standalone Desktop Window via Electron
                string electronLocal = Path.Combine(projectDir, "node_modules", "electron", "dist", "electron.exe");
                if (File.Exists(electronLocal))
                {
                    ProcessStartInfo electronPsi = new ProcessStartInfo
                    {
                        FileName = electronLocal,
                        Arguments = ".",
                        WorkingDirectory = projectDir,
                        UseShellExecute = false
                    };
                    Process.Start(electronPsi);
                }
                else
                {
                    // Fallback to launching in default browser
                    Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true });
                }
            }
            catch (Exception ex)
            {
                try { Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true }); } catch { }
            }
        }

        private static bool IsServerRunning(string url)
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Timeout = 800;
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

        private static void CreateDesktopShortcut(string targetExePath)
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                string shortcutPath = Path.Combine(desktopPath, "BendLens.lnk");

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetExePath;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetExePath);
                    shortcut.Description = "BendLens - Universal Backend Architecture & Blast Platform";
                    shortcut.Save();
                }
            }
            catch { }
        }
    }
}
