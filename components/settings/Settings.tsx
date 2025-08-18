
import React, { useState, useEffect } from 'react';
import { getDocs, collection, setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import { ICONS } from '../../constants';

const Settings: React.FC = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    const exportToCSV = <T extends object,>(data: T[], filename: string) => {
        if (data.length === 0) return;
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => 
                headers.map(fieldName => 
                    JSON.stringify(row[fieldName as keyof T], (key, value) => value === null ? '' : value)
                ).join(',')
            )
        ];
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportAllData = async () => {
        try {
            const tasksSnapshot = await getDocs(collection(db, "tasks"));
            const usersSnapshot = await getDocs(collection(db, "users"));
            
            const tasksData = tasksSnapshot.docs.map(doc => doc.data());
            const usersData = usersSnapshot.docs.map(doc => doc.data());

            exportToCSV(tasksData, "semua_pekerjaan.csv");
            exportToCSV(usersData, "semua_pegawai.csv");
            alert("Data berhasil diekspor!");
        } catch(error) {
            console.error("Error exporting data: ", error);
            alert("Gagal mengekspor data.");
        }
    };
    
    const setupInitialAdmin = async () => {
        if (!window.confirm("Ini akan membuat user admin awal di Firebase Authentication dan Firestore. Hanya jalankan jika ini adalah setup pertama kali. Lanjutkan?")) return;
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, 'admin@proapp.local', 'Admin123');
            const user = userCredential.user;
            
            await setDoc(doc(db, "users", user.uid), {
                nama: "Admin Utama",
                email: "admin@proapp.local",
                noWhatsapp: "081234567890",
                role: "admin",
                uid: user.uid
            });
            alert("User admin berhasil dibuat! Silakan login.");
        } catch (error) {
            console.error("Error creating initial admin: ", error);
            alert("Gagal membuat admin. Kemungkinan user sudah ada.");
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-8">
            <div>
                <h3 className="text-2xl font-bold mb-4">Pengaturan Tampilan</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Tema</label>
                        <select value={theme} onChange={e => setTheme(e.target.value)} className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="light">Light Mode</option>
                            <option value="dark">Dark Mode</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div>
                <h3 className="text-2xl font-bold mb-4">Ekspor Data</h3>
                <button onClick={handleExportAllData} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    {ICONS.download}
                    <span>Export Semua Data (CSV)</span>
                </button>
            </div>
            
            <div>
                <h3 className="text-2xl font-bold mb-4">Tindakan Berbahaya</h3>
                <p className="text-sm text-gray-500 mb-2">Gunakan tombol ini hanya untuk setup awal aplikasi.</p>
                <button onClick={setupInitialAdmin} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    Setup Akun Admin Awal
                </button>
            </div>
        </div>
    );
};

export default Settings;
