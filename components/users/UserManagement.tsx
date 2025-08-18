
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserData } from '../../types';
import { ICONS } from '../../constants';
import UserModal from './UserModal';
import LoadingSpinner from '../common/LoadingSpinner';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
            setUsers(usersData);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const openModal = (user: UserData | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus pegawai ini? Ini hanya akan menghapus data dari database, bukan akun autentikasi.')) {
            try {
                await deleteDoc(doc(db, "users", userId));
                alert("Pegawai berhasil dihapus dari database.");
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
                                    <td className="p-4 font-medium">{user.nama}</td>
                                    <td className="p-4">{user.email}</td>
                                    <td className="p-4">{user.noWhatsapp}</td>
                                    <td className="p-4 capitalize">{user.role}</td>
                                    <td className="p-4 flex items-center space-x-2">
                                        <button onClick={() => openModal(user)} className="p-2 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300">{ICONS.edit}</button>
                                        {user.role !== 'admin' && <button onClick={() => handleDelete(user.id)} className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-300">{ICONS.delete}</button>}
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
