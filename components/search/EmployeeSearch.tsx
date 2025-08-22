
import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeProfile } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import EmployeeProfileCard from './EmployeeProfileCard';
import { ICONS } from '../../constants';

// The URL is taken from the user's prompt. It points to the published CSV version of the sheet.
const SHEET_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vT7wdYuXPw-6RCvXKSjK5xMwGLWc3eHYbaqpoY4PYSYm6NJOvCnU7iQUk33yAMtHTeKeD8T-x8Ful2l/pub?gid=0&single=true&output=csv`;

// Updated mapping to match the new CSV headers provided by the user.
// This is crucial for parsing the data correctly.
const headerMapping: { [key: string]: keyof EmployeeProfile } = {
    nip: 'nip',
    fullname: 'fullName',
    level: 'level',
    grade: 'grade',
    startdate: 'startDate',
    employeesubgroup: 'employeeSubgroup',
    jabatan: 'jabatan',
    tmtjabatan: 'tmtJabatan',
    lamajabatan: 'lamaJabatan',
    unitkerja: 'unitKerja',
    area: 'area',
    kelascabang: 'kelasCabang',
    tmtmasuk: 'tmtMasuk',
    'masakerja(darikontrak)': 'masaKerja',
    tmtmandiri: 'tmtMandiri',
    tmttetap: 'tmtTetap',
    usiapensiunpegawai: 'usiaPensiun',
    tanggalpensiun: 'tanggalPensiun',
    religiousdenominationkey: 'agama',
    birthdate: 'birthDate',
    mobilephonelinkaja: 'noHpLinkAja',
    pl2022: 'pl2022',
    tc2022: 'tc2022',
    pl2023: 'pl2023',
    tc2023: 'tc2023',
    pl2024: 'pl2024',
    tc2024: 'tc2024',
};


// New helper function to parse CSV data from the published Google Sheet.
// This replaces the old JSON parsing logic which used a deprecated API.
const parseSheetData = (csvText: string): EmployeeProfile[] => {
    // Split text into lines, removing any empty lines at the end.
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return []; // Need at least a header and one data row.

    // Get headers from the first line, clean them up for reliable mapping.
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s()]+/g, ''));
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
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);


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
        // Added a fallback for employee.fullName to prevent crashes on records with missing names.
        return employeeData.filter(employee =>
            (employee.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, employeeData]);
    
    const handleSelectEmployee = (employee: EmployeeProfile) => {
        setSelectedEmployee(employee);
        setSearchTerm(''); // Clear search term after selection
    };
    
    const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedNip = e.target.value;
        const employee = employeeData.find(emp => emp.nip === selectedNip);
        if (employee) {
            setSelectedEmployee(employee);
        } else {
            setSelectedEmployee(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Pencarian Database Pegawai</h1>
                <p className="text-gray-500 dark:text-gray-400">Akses informasi detail pegawai secara instan.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Ketik nama lengkap pegawai..."
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setSelectedEmployee(null); // Clear selection when typing
                        }}
                        className="w-full p-4 pl-12 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        {ICONS.search}
                    </div>
                </div>
                <div className="relative">
                     <select 
                        onChange={handleDropdownChange}
                        className="w-full p-4 pl-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                        defaultValue=""
                     >
                        <option value="" disabled>Atau pilih pegawai dari daftar...</option>
                        {employeeData.sort((a,b) => (a.fullName || "").localeCompare(b.fullName || "")).map(emp => (
                            <option key={emp.nip} value={emp.nip}>{emp.fullName}</option>
                        ))}
                     </select>
                </div>
            </div>


            <div className="mt-6">
                {loading && <div className="text-center p-10"><LoadingSpinner text="Mengambil data pegawai..." /></div>}
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert"><p className="font-bold">Error</p><p>{error}</p></div>}
                
                {!loading && !error && (
                     <div className="space-y-4">
                        {selectedEmployee ? (
                            <EmployeeProfileCard 
                                employee={selectedEmployee} 
                                onClose={() => setSelectedEmployee(null)} 
                            />
                        ) : searchTerm && searchResults.length > 0 ? (
                            <>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Menampilkan {searchResults.length} hasil untuk "{searchTerm}"</p>
                                <ul className="bg-white dark:bg-gray-800 rounded-lg shadow-md divide-y dark:divide-gray-700">
                                {searchResults.map(employee => (
                                    <li 
                                        key={employee.nip || Math.random()} 
                                        onClick={() => handleSelectEmployee(employee)}
                                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-4"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center font-bold text-xl text-indigo-600 dark:text-indigo-300 flex-shrink-0">
                                            {((employee.fullName || '').split(' ').map(n => n[0]).join('') || '??').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white">{employee.fullName}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.jabatan || 'Jabatan tidak tersedia'}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">NIP: {employee.nip || '-'}</p>
                                        </div>
                                    </li>
                                ))}
                                </ul>
                            </>
                        ) : searchTerm && searchResults.length === 0 ? (
                             <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Pegawai Tidak Ditemukan</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">Tidak ada data pegawai yang cocok dengan nama "{searchTerm}".</p>
                            </div>
                        ) : (
                             <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Mulai Mencari</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">Gunakan bilah pencarian atau dropdown di atas untuk menemukan data pegawai.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeSearch;
