import React, { useState } from 'react';
import { collection, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
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
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (user) { // Edit existing user
                const userRef = doc(db, "users", user.id);
                await updateDoc(userRef, { nama, email, noWhatsapp, role });
                alert('Data pegawai berhasil diperbarui.');
            } else { // Add new user
                if (password !== confirmPassword) {
                    alert("Password tidak cocok.");
                    setLoading(false);
                    return;
                }
                if (password.length < 6) {
                    alert("Password minimal harus 6 karakter.");
                    setLoading(false);
                    return;
                }
                
                // This creates the user in Firebase Authentication.
                // NOTE: This will sign out the admin and sign in the new user due to Firebase SDK limitations.
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const newUser = userCredential.user;

                // Create the user document in Firestore, using the UID from Auth as the document ID.
                // This is crucial for linking Auth and Firestore data.
                await setDoc(doc(db, "users", newUser.uid), {
                    uid: newUser.uid,
                    nama,
                    email,
                    noWhatsapp,
                    role,
                });
                
                alert(`Pegawai ${nama} berhasil dibuat.\n\nPERHATIAN: Sesi admin Anda telah berakhir dan sistem sekarang login sebagai pengguna baru. Harap logout dan login kembali dengan akun admin Anda untuk melanjutkan.`);
            }
            closeModal();
        } catch (error) {
            console.error("Error saving user: ", error);
            const err = error as { message?: string };
            alert(`Gagal menyimpan data pegawai. Pastikan email unik.\nError: ${err.message}`);
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
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required disabled={!!user} />
                         {user && <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah.</p>}
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Nomor WhatsApp</label>
                        <input type="tel" value={noWhatsapp} onChange={e => setNoWhatsapp(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    {!user && (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 6 karakter" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Konfirmasi Password</label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                            </div>
                        </>
                    )}
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
