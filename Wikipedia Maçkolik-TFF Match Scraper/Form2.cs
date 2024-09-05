using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Wikipedia_Maçkolik_TFF_Match_Scraper
{
    public partial class Form2 : Form
    {
        public Form2()
        {
            InitializeComponent();
        }
        string[] files = File.ReadAllLines("all.txt");
        private void button1_Click(object sender, EventArgs e)
        {
            for (int i = 0; i < files.Length; i++)
            {
                //if (File.ReadAllText(files[i] + ".txt").Contains("="))
                //    richTextBox1.AppendText("|");
                richTextBox1.AppendText(File.ReadAllText(files[i] + ".txt") + "\n\n");
            }
        }

        private void Form2_FormClosed(object sender, FormClosedEventArgs e)
        {
            //Application.Exit();
        }
    }
}
