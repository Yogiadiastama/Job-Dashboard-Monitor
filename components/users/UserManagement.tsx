import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from '@firebase/firestore';
import { ref, deleteObject } from '@firebase/storage';
import { db, storage, getFirestoreErrorMessage } from '../../services/firebase';
import { UserData } from '../../types';
import { ICONS } from '../../constants';
import UserModal from './UserModal';
import LoadingSpinner from '../common/LoadingSpinner';
import { useNotification, useConnectivity } from '../../hooks/useNotification';
import EditableText from '../common/EditableText';
import { defaultTextContent } from '../../hooks/useCustomization';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const { showNotification } = useNotification();
    const { setOffline } = useConnectivity();

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
                if (firebaseError.code === 'unavailable') {
                    setOffline(true, true);
                } else {
                    showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                }
                setLoading(false);
            }
        );
        return () => unsub();
    }, [showNotification, setOffline]);

    const openModal = (user: UserData | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleDelete = async (user: UserData) => {
        if (window.confirm(`Are you sure you want to delete ${user.nama}? This will remove their data and profile picture.`)) {
            try {
                if (user.photoURL) {
                    const photoRef = ref(storage, `profile-pictures/${user.uid}`);
                    await deleteObject(photoRef).catch(error => {
                        if (error.code !== 'storage/object-not-found') {
                            console.error("Error deleting profile photo:", error);
                        }
                    });
                }
                
                await deleteDoc(doc(db, "users", user.id));
                alert("Employee deleted successfully.");
            } catch (error) {
                console.error("Error deleting user: ", error);
                alert("Failed to delete employee.");
            }
        }
    };
    
    return (
        <div className="space-y-6 animate-fade-in-down">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <EditableText 
                    as="h1"
                    contentKey="users.title"
                    defaultText={defaultTextContent['users.title']}
                    className="text-3xl font-bold text-slate-800 dark:text-slate-100"
                />
                <button onClick={() => openModal()} className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                    {ICONS.add}
                    <span>Add Employee</span>
                </button>
            </div>
            {loading ? <LoadingSpinner text="Loading employee data..." /> : (
                 <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Email</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">WhatsApp No.</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 font-medium">
                                            <div className="flex items-center space-x-3">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt={user.nama} className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                                                        {user.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-slate-900 dark:text-slate-50">{user.nama}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">{user.email}</td>
                                        <td className="p-4">{user.noWhatsapp}</td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 capitalize">{user.role}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center space-x-1 text-slate-500">
                                                <button onClick={() => openModal(user)} title="Edit" className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400">{ICONS.edit}</button>
                                                {user.role !== 'admin' && <button onClick={() => handleDelete(user)} title="Delete" className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-400/20 text-red-600 dark:text-red-400">{ICONS.delete}</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {isModalOpen && <UserModal user={editingUser} closeModal={closeModal} />}
        </div>
    );
};

export default UserManagement;
