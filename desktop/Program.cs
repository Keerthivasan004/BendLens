using System;
using System.Threading;
using System.Windows.Forms;

namespace BendLens.Desktop
{
    internal static class Program
    {
        private const string MutexName = @"Global\BendLens-Studio-SingleInstance";

        [STAThread]
        private static void Main()
        {
            ApplicationConfiguration.Initialize();

            bool createdNew;
            using Mutex mutex = new Mutex(true, MutexName, out createdNew);

            if (!createdNew)
            {
                MessageBox.Show(
                    "BendLens Studio is already running.\n\nThe existing application window has been brought to focus.",
                    "BendLens Already Running",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                return;
            }

            Application.Run(new MainWindow());
        }
    }
}
