
import React, { useState } from 'react';
import { collection, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserData, UserRole } from '../../types';

interface UserModalProps {
    user: UserData | null;
    closeModal: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, closeModal }) => {
    const [nama, setNama] = useState(user ? user.nama : '');
    const [email, setEmail] = useState(user ? user.email : '');
    const [noWhatsapp, setNoWhatsapp] = useState(user ? user.noWhatsapp : '');
    const [role, setRole] = useState<UserRole>(user ? user.role : 'pegawai');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (user) { 
                const userRef = doc(db, "users", user.id);
                await updateDoc(userRef, { nama, email, noWhatsapp, role });
            } else { 
                const firstName = nama.split(' ')[0].toLowerCase();
                const username = `${firstName}@proapp.local`;
                const password = `${firstName}123`;

                // In a real app, this should trigger a Firebase Function to create the auth user.
                // This client-side implementation just adds to Firestore.
                await addDoc(collection(db, "users"), {
                    nama,
                    email,
                    noWhatsapp,
                    role,
                    uid: "UID_generated_by_auth_in_backend" // Placeholder UID
                });
                alert(`Pegawai ${nama} ditambahkan ke database. Akun otentikasi harus dibuat secara terpisah.\n\nUsername: ${username}\nPassword: ${password}`);
            }
            closeModal();
        } catch (error) {
            console.error("Error saving user: ", error);
            alert("Gagal menyimpan data pegawai.");
        } finally {
            setLoading(false);
        }
    };
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6">{user ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Nama Lengkap</label>
                        <input type="text" value={nama} onChange={e => setNama(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Nomor WhatsApp</label>
                        <input type="tel" value={noWhatsapp} onChange={e => setNoWhatsapp(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="pegawai">Pegawai</option>
                            <option value="pimpinan">Pimpinan</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 mt-8">
                        <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Batal</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
