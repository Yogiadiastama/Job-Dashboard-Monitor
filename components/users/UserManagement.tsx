import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from '@firebase/firestore';
import { ref, deleteObject } from '@firebase/storage';
import { db, storage, getFirestoreErrorMessage } from '../../services/firebase';
import { UserData } from '../../types';
import { ICONS } from '../../constants';
import UserModal from './UserModal';
import LoadingSpinner from '../common/LoadingSpinner';
import { useNotification } from '../../hooks/useNotification';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const { showNotification } = useNotification();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), 
            (snapshot) => {
                const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
                setUsers(usersData);
                setLoading(false);
            },
            (error) => {
                console.error("UserManagement: Error fetching users:", error);
                const firebaseError = error as { code?: string };
                showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                setLoading(false);
            }
        );
        return () => unsub();
    }, [showNotification]);

    const openModal = (user: UserData | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleDelete = async (user: UserData) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${user.nama}? Tindakan ini akan menghapus data dan foto profilnya.`)) {
            try {
                // Delete profile picture from Storage if it exists
                if (user.photoURL) {
                    const photoRef = ref(storage, `profile-pictures/${user.uid}`);
                    await deleteObject(photoRef).catch(error => {
                        // It's okay if the file doesn't exist, log other errors
                        if (error.code !== 'storage/object-not-found') {
                            console.error("Error deleting profile photo:", error);
                        }
                    });
                }
                
                // Delete user document from Firestore
                await deleteDoc(doc(db, "users", user.id));
                alert("Pegawai berhasil dihapus.");
            } catch (error) {
                console.error("Error deleting user: ", error);
                alert("Gagal menghapus pegawai.");
            }
        }
    };
    
    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Manajemen Pegawai</h3>
                <button onClick={() => openModal()} className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                    {ICONS.add}
                    <span>Tambah Pegawai</span>
                </button>
            </div>
            {loading ? <LoadingSpinner text="Memuat data pegawai..." /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/50">
                                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Nama</th>
                                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Email</th>
                                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">No. WhatsApp</th>
                                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Role</th>
                                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                    <td className="p-4 font-medium">
                                        <div className="flex items-center space-x-3">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt={user.nama} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-neutral-500 flex-shrink-0">
                                                    {user.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="text-neutral-800 dark:text-neutral-100">{user.nama}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-neutral-600 dark:text-neutral-300">{user.email}</td>
                                    <td className="p-4 text-neutral-600 dark:text-neutral-300">{user.noWhatsapp}</td>
                                    <td className="p-4 text-neutral-600 dark:text-neutral-300 capitalize">{user.role}</td>
                                    <td className="p-4 flex items-center space-x-2">
                                        <button onClick={() => openModal(user)} className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-800/50 text-yellow-500">{ICONS.edit}</button>
                                        {user.role !== 'admin' && <button onClick={() => handleDelete(user)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50 text-red-500">{ICONS.delete}</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {isModalOpen && <UserModal user={editingUser} closeModal={closeModal} />}
        </div>
    );
};

export default UserManagement;