import React, { useState } from 'react';
import { collection, doc, updateDoc, setDoc } from '@firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth } from '@firebase/auth';
import { initializeApp, deleteApp } from '@firebase/app';
import { ref, uploadBytes, getDownloadURL, deleteObject } from '@firebase/storage';
import { db, auth as mainAuth, firebaseConfig, storage } from '../../services/firebase';
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
    
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(user?.photoURL || null);
    const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);

    const handlePasswordReset = async () => {
        if (!user) return;
        if (window.confirm(`Are you sure you want to send a password reset email to ${user.email}?`)) {
            setIsResetting(true);
            try {
                await sendPasswordResetEmail(mainAuth, user.email);
                alert(`Password reset email has been sent successfully to ${user.email}.`);
            } catch (error) {
                console.error("Error sending password reset email: ", error);
                const err = error as { message?: string };
                alert(`Failed to send email. Error: ${err.message}`);
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
                alert('Employee data updated successfully.');
                closeModal();

            } else { // Add new user
                if (password !== confirmPassword) {
                    alert("Passwords do not match.");
                    setLoading(false);
                    return;
                }
                if (password.length < 6) {
                    alert("Password must be at least 6 characters long.");
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
                    
                    alert(`Employee ${nama} created successfully.`);
                    closeModal();
                } finally {
                    await deleteApp(tempApp);
                }
            }
        } catch (error) {
            console.error("Error saving user: ", error);
            const err = error as { code?: string, message?: string };
            const errorMessage = err.code === 'auth/email-already-in-use' 
                ? 'This email is already registered. Please use another email.'
                : `Failed to save employee data. Error: ${err.message}`;
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    const inputStyle = "appearance-none border border-slate-300 dark:border-slate-600 rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200";
    const labelStyle = "block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300";

    return (
        <div className="fixed inset-0 flex items-start justify-center z-50 p-4 modal-backdrop pt-16" onClick={closeModal}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">{user ? 'Edit Employee' : 'Add New Employee'}</h2>
                </div>
                <form id="user-modal-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className={labelStyle}>Profile Photo</label>
                        <div className="flex items-center space-x-4">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                                    {nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                                </div>
                            )}
                            <div className="flex-1 space-y-2">
                                <label htmlFor="profilePicInput" className="cursor-pointer w-full text-center px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors">
                                    Upload Photo
                                </label>
                                <input id="profilePicInput" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                {imagePreview && <button type="button" onClick={handleRemovePhoto} className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors">Remove Photo</button>}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelStyle}>Full Name</label>
                        <input type="text" value={nama} onChange={e => setNama(e.target.value)} className={inputStyle} required />
                    </div>
                     <div>
                        <label className={labelStyle}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputStyle} required disabled={!!user} />
                        {user && <p className="text-xs text-slate-400 mt-1">Email cannot be changed after creation.</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>WhatsApp Number</label>
                            <input type="tel" value={noWhatsapp} onChange={e => setNoWhatsapp(e.target.value)} className={inputStyle} required />
                        </div>
                        <div>
                            <label className={labelStyle}>Role</label>
                            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className={inputStyle} required>
                                <option value="pegawai">Pegawai</option>
                                <option value="pimpinan">Pimpinan</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                    
                    {!user && (
                        <>
                            <hr className="dark:border-slate-600"/>
                            <p className={labelStyle}>Set Initial Password</p>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelStyle}>Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputStyle} required />
                                </div>
                                <div>
                                    <label className={labelStyle}>Confirm Password</label>
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputStyle} required />
                                </div>
                            </div>
                        </>
                    )}
                    
                    {user && (
                        <div>
                            <button type="button" onClick={handlePasswordReset} disabled={isResetting} className="w-full px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors disabled:opacity-50">
                                {isResetting ? 'Sending Email...' : 'Send Password Reset Email'}
                            </button>
                        </div>
                    )}

                </form>
                <div className="flex justify-end space-x-4 p-6 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button type="submit" form="user-modal-form" disabled={loading} className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {loading ? 'Saving...' : 'Save Employee'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserModal;