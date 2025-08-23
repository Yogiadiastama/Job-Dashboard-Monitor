
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged } from '@firebase/auth';
import { doc, onSnapshot } from '@firebase/firestore';
import { auth, db, getFirestoreErrorMessage } from '../services/firebase';
import { UserData } from '../types';
import { useNotification, useConnectivity } from './useNotification';

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    loading: true,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const { setOffline } = useConnectivity();

    useEffect(() => {
        let userDocUnsubscribe: () => void = () => {};

        const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            userDocUnsubscribe(); // Unsubscribe from any previous user doc listener

            if (firebaseUser) {
                setUser(firebaseUser);
                const userDocRef = doc(db, "users", firebaseUser.uid);
                
                userDocUnsubscribe = onSnapshot(userDocRef, 
                    (docSnap) => {
                        if (docSnap.exists()) {
                            setUserData({ id: docSnap.id, ...docSnap.data() } as UserData);
                        } else {
                            console.log("No such user document!");
                            setUserData(null);
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error("Error fetching user data (might be offline):", error);
                        const firebaseError = error as { code?: string };
                        if (firebaseError.code === 'unavailable') {
                            setOffline(true, true);
                        } else {
                            showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                        }
                        // Don't nullify data on network errors, allowing cached data to be used.
                        setLoading(false);
                    }
                );
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            userDocUnsubscribe();
        };
    }, [showNotification, setOffline]);

    const value = { user, userData, loading };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};