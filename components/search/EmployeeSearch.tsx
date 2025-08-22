
import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeProfile } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import EmployeeProfileCard from './EmployeeProfileCard';

// The URL is taken from the user's prompt. It points to the published CSV version of the sheet.
const SHEET_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vT7wdYuXPw-6RCvXKSjK5xMwGLWc3eHYbaqpoY4PYSYm6NJOvCnU7iQUk33yAMtHTeKeD8T-x8Ful2l/pub?gid=0&single=true&output=csv`;

// This mapping is crucial to convert CSV headers (like 'employeeid')
// to the camelCase keys used in the EmployeeProfile type (like 'employeeId').
// It's derived from the old implementation's G-Sheets JSON keys.
const headerMapping: { [key: string]: keyof EmployeeProfile } = {
    employeeid: 'employeeId',
    fullname: 'fullName',
    gender: 'gender',
    age: 'age',
    email: 'email',
    position: 'position',
    joindate: 'joinDate',
    performanceratinglast3years: 'performanceRating',
    grade: 'grade',
    graderange: 'gradeRange',
    tmtgrade: 'tmtGrade',
    maritalstatus: 'maritalStatus',
    workcontracttype: 'workContractType',
    bankmandirijoindate: 'bankMandiriJoinDate',
    permanentemployeedate: 'permanentEmployeeDate',
    pensiondate: 'pensionDate',
    organizationunit: 'organizationUnit',
    group: 'group',
    tmtgroup: 'tmtGroup',
    corporatetitle: 'corporateTitle',
    jobfamily: 'jobFamily',
    directorate: 'directorate',
    legacy: 'legacy',
    location: 'location',
    tmtlocation: 'tmtLocation',
    ememployeemanager: 'em',
    emmemployeemanagermanager: 'emm',
};

// New helper function to parse CSV data from the published Google Sheet.
// This replaces the old JSON parsing logic which used a deprecated API.
const parseSheetData = (csvText: string): EmployeeProfile[] => {
    // Split text into lines, removing any empty lines at the end.
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return []; // Need at least a header and one data row.

    // Get headers from the first line, clean them up for reliable mapping.
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
    const employeeProfiles: EmployeeProfile[] = [];

    // This regex robustly handles commas within quoted fields (e.g., "Value, with comma").
    const csvRegex = /(?:,|^)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;

    // Process each data row.
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue; // Skip empty rows

        const profile: Partial<EmployeeProfile> = {};
        let match;
        let headerIndex = 0;
        csvRegex.lastIndex = 0; // Reset regex state for each new line.

        while ((match = csvRegex.exec(lines[i])) && headerIndex < headers.length) {
            const csvHeader = headers[headerIndex];
            const profileKey = headerMapping[csvHeader]; // Find the corresponding camelCase key.

            if (profileKey) {
                // value is from either the quoted group (match[1]) or unquoted group (match[2]).
                let value = match[1] !== undefined
                    ? match[1].replace(/""/g, '"') // Unescape double quotes inside a quoted field.
                    : match[2];
                
                profile[profileKey] = value.trim();
            }
            headerIndex++;
        }
        
        employeeProfiles.push(profile as EmployeeProfile);
    }
    return employeeProfiles;
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
                    // Provide a more specific error message based on the new fetching method.
                    throw new Error(`Gagal mengambil data dari Google Sheet (Status: ${response.status}). Pastikan link CSV publik valid dan dapat diakses.`);
                }
                const csvText = await response.text();
                const parsedData = parseSheetData(csvText);
                setEmployeeData(parsedData);
            } catch (err) {
                console.error("Error fetching or parsing sheet data:", err);
                const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui saat memuat data.';
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
