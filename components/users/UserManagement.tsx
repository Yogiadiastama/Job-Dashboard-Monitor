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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Manajemen Pegawai</h3>
                <button onClick={() => openModal()} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    {ICONS.add}
                    <span>Tambah Pegawai</span>
                </button>
            </div>
            {loading ? <LoadingSpinner text="Memuat data pegawai..." /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 dark:border-gray-700">
                                <th className="p-4">Foto</th>
                                <th className="p-4">Nama</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">No. WhatsApp</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="p-4">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt={user.nama} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500">
                                                {user.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 font-medium">{user.nama}</td>
                                    <td className="p-4">{user.email}</td>
                                    <td className="p-4">{user.noWhatsapp}</td>
                                    <td className="p-4 capitalize">{user.role}</td>
                                    <td className="p-4 flex items-center space-x-2">
                                        <button onClick={() => openModal(user)} className="p-2 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300">{ICONS.edit}</button>
                                        {user.role !== 'admin' && <button onClick={() => handleDelete(user)} className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-300">{ICONS.delete}</button>}
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