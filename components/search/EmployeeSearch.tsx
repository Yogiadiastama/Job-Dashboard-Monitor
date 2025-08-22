
import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeProfile } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import EmployeeProfileCard from './EmployeeProfileCard';

const SHEET_ID = '1VDcH6vEEZ2D1i2T57dRS7tDIYLN4NvupZviFt8twVx0';
const SHEET_URL = `https://spreadsheets.google.com/feeds/list/${SHEET_ID}/od6/public/values?alt=json`;

// Helper function to transform the ugly Google Sheets JSON into a clean array of objects
const parseSheetData = (data: any): EmployeeProfile[] => {
    const entries = data.feed.entry || [];
    return entries.map((entry: any) => ({
        employeeId: entry['gsx$employeeid']?.$t || '',
        fullName: entry['gsx$fullname']?.$t || '',
        gender: entry['gsx$gender']?.$t || '',
        age: entry['gsx$age']?.$t || '',
        email: entry['gsx$email']?.$t || '',
        position: entry['gsx$position']?.$t || '',
        joinDate: entry['gsx$joindate']?.$t || '',
        performanceRating: entry['gsx$performanceratinglast3years']?.$t || '',
        grade: entry['gsx$grade']?.$t || '',
        gradeRange: entry['gsx$graderange']?.$t || '',
        tmtGrade: entry['gsx$tmtgrade']?.$t || '',
        maritalStatus: entry['gsx$maritalstatus']?.$t || '',
        workContractType: entry['gsx$workcontracttype']?.$t || '',
        bankMandiriJoinDate: entry['gsx$bankmandirijoindate']?.$t || '',
        permanentEmployeeDate: entry['gsx$permanentemployeedate']?.$t || '',
        pensionDate: entry['gsx$pensiondate']?.$t || '',
        organizationUnit: entry['gsx$organizationunit']?.$t || '',
        group: entry['gsx$group']?.$t || '',
        tmtGroup: entry['gsx$tmtgroup']?.$t || '',
        corporateTitle: entry['gsx$corporatetitle']?.$t || '',
        jobFamily: entry['gsx$jobfamily']?.$t || '',
        directorate: entry['gsx$directorate']?.$t || '',
        legacy: entry['gsx$legacy']?.$t || '',
        location: entry['gsx$location']?.$t || '',
        tmtLocation: entry['gsx$tmtlocation']?.$t || '',
        em: entry['gsx$ememployeemanager']?.$t || '',
        emm: entry['gsx$emmemployeemanagermanager']?.$t || '',
    }));
};

const EmployeeSearch: React.FC = () => {
    const [employeeData, setEmployeeData] = useState<EmployeeProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployeeData = async () => {
            try {
                const response = await fetch(SHEET_URL);
                if (!response.ok) {
                    throw new Error(`Gagal mengambil data. Status: ${response.status}. Pastikan Google Sheet Anda sudah di-"Publish to the web".`);
                }
                const data = await response.json();
                const parsedData = parseSheetData(data);
                setEmployeeData(parsedData);
            } catch (err) {
                console.error("Error fetching or parsing sheet data:", err);
                const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeData();
    }, []);

    const searchResults = useMemo(() => {
        if (!searchTerm) {
            return [];
        }
        return employeeData.filter(employee =>
            employee.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, employeeData]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Pencarian Database Pegawai</h1>
                <p className="text-gray-500 dark:text-gray-400">Akses informasi detail pegawai secara instan.</p>
            </header>

            <div className="relative">
                <input
                    type="text"
                    placeholder="Ketik nama lengkap pegawai..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-4 pl-12 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>

            <div className="mt-6">
                {loading && <div className="text-center p-10"><LoadingSpinner text="Mengambil data pegawai..." /></div>}
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert"><p className="font-bold">Error</p><p>{error}</p></div>}
                
                {!loading && !error && (
                    <div className="space-y-4">
                        {searchTerm && searchResults.length > 0 && (
                             <p className="text-sm text-gray-500 dark:text-gray-400">Menampilkan {searchResults.length} hasil untuk "{searchTerm}"</p>
                        )}
                        
                        {searchResults.map(employee => (
                            <EmployeeProfileCard key={employee.employeeId} employee={employee} />
                        ))}
                        
                        {searchTerm && searchResults.length === 0 && (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Pegawai Tidak Ditemukan</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">Tidak ada data pegawai yang cocok dengan nama "{searchTerm}".</p>
                            </div>
                        )}
                        
                        {!searchTerm && (
                             <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Mulai Mencari</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">Gunakan bilah pencarian di atas untuk menemukan data pegawai.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeSearch;