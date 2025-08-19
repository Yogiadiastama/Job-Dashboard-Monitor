import React, { useState } from 'react';
import { collection, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth as mainAuth, firebaseConfig, storage } from '../../services/firebase';
import { useNotification } from '../../hooks/useNotification';
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
    const [isResetting, setIsResetting] = useState(false);
    const { showNotification } = useNotification();
    
    // State for photo management
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(user?.photoURL || null);
    const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);

    const handlePasswordReset = async () => {
        if (!user) return;
        if (window.confirm(`Apakah Anda yakin ingin mengirim email reset password ke ${user.email}?`)) {
            setIsResetting(true);
            try {
                await sendPasswordResetEmail(mainAuth, user.email);
                showNotification(`Email reset password telah dikirim ke ${user.email}.`, 'success');
            } catch (error) {
                console.error("Error sending password reset email: ", error);
                const err = error as { message?: string };
                showNotification(`Gagal mengirim email. Error: ${err.message}`, 'error');
            } finally {
                setIsResetting(false);
            }
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePicFile(file);
            setImagePreview(URL.createObjectURL(file));
            setIsPhotoRemoved(false);
        }
    };

    const handleRemovePhoto = () => {
        setProfilePicFile(null);
        setImagePreview(null);
        setIsPhotoRemoved(true);
        const fileInput = document.getElementById('profilePicInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (user) { // Edit existing user
                let updatedPhotoURL = user.photoURL || '';

                if (profilePicFile) { // New photo uploaded
                    const photoRef = ref(storage, `profile-pictures/${user.uid}`);
                    await uploadBytes(photoRef, profilePicFile);
                    updatedPhotoURL = await getDownloadURL(photoRef);
                } else if (isPhotoRemoved && user.photoURL) { // Existing photo removed
                    const photoRef = ref(storage, `profile-pictures/${user.uid}`);
                    await deleteObject(photoRef).catch(err => {
                        if (err.code !== 'storage/object-not-found') console.error("Could not delete old photo:", err);
                    });
                    updatedPhotoURL = '';
                }

                const userRef = doc(db, "users", user.id);
                await updateDoc(userRef, { nama, noWhatsapp, role, photoURL: updatedPhotoURL });
                showNotification('Data pegawai berhasil diperbarui.', 'success');
                closeModal();

            } else { // Add new user
                if (password !== confirmPassword) {
                    showNotification("Password tidak cocok.", 'error');
                    setLoading(false);
                    return;
                }
                if (password.length < 6) {
                    showNotification("Password minimal harus 6 karakter.", 'error');
                    setLoading(false);
                    return;
                }

                const tempAppName = `temp-app-${Date.now()}`;
                const tempApp = initializeApp(firebaseConfig, tempAppName);
                const tempAuth = getAuth(tempApp);

                try {
                    const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
                    const newUser = userCredential.user;

                    let photoURL = '';
                    if (profilePicFile) {
                        const photoRef = ref(storage, `profile-pictures/${newUser.uid}`);
                        await uploadBytes(photoRef, profilePicFile);
                        photoURL = await getDownloadURL(photoRef);
                    }

                    await setDoc(doc(db, "users", newUser.uid), {
                        uid: newUser.uid,
                        nama,
                        email,
                        noWhatsapp,
                        role,
                        photoURL,
                    });
                    
                    showNotification(`Pegawai ${nama} berhasil dibuat.`, 'success');
                    closeModal();
                } finally {
                    await deleteApp(tempApp);
                }
            }
        } catch (error) {
            console.error("Error saving user: ", error);
            const err = error as { code?: string, message?: string };
            const errorMessage = err.code === 'auth/email-already-in-use' 
                ? 'Email ini sudah terdaftar. Silakan gunakan email lain.'
                : `Gagal menyimpan data pegawai. Error: ${err.message}`;
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-fade-in-up max-h-[95vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{user ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Nama Lengkap</label>
                        <input type="text" value={nama} onChange={e => setNama(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Foto Profil</label>
                        <div className="flex items-center space-x-4">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500">
                                    {nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                                </div>
                            )}
                            <div className="flex-1">
                                <input 
                                    id="profilePicInput"
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                {imagePreview && (
                                    <button 
                                        type="button" 
                                        onClick={handleRemovePhoto}
                                        className="mt-2 text-xs text-red-500 hover:text-red-700"
                                    >
                                        Hapus Foto
                                    </button>
                                )}
                            </div>
                        </div>
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
                    {user && (
                         <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Manajemen Password</label>
                            <button
                                type="button"
                                onClick={handlePasswordReset}
                                disabled={isResetting}
                                className="w-full p-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                            >
                                {isResetting ? 'Mengirim...' : 'Kirim Email Reset Password'}
                            </button>
                        </div>
                    )}
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