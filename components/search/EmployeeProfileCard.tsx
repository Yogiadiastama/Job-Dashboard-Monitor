
import React from 'react';
import { EmployeeProfile } from '../../types';

// Helper to check for meaningful data (not null, not empty, not just a dash)
const hasValue = (value: string | undefined | null): value is string => 
    !!value && value.trim() !== '' && value.trim() !== '-';

// Reusable component for displaying a piece of information
const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div className="flex-1 min-w-[150px]">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-gray-800 dark:text-gray-200">{value || '-'}</p>
    </div>
);

// A new, specific Performance Table component for the user's data structure
const PerformanceTable: React.FC<{ employee: EmployeeProfile }> = ({ employee }) => {
    // Check if there's any performance data to display. If not, don't render the table.
    const hasPerformanceData = hasValue(employee.pl2022) || hasValue(employee.tc2022) ||
                             hasValue(employee.pl2023) || hasValue(employee.tc2023) ||
                             hasValue(employee.pl2024) || hasValue(employee.tc2024);
    if (!hasPerformanceData) return null;

    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden mt-4">
            <h3 className="text-md font-bold p-4 bg-gray-200 dark:bg-gray-700">Performance Level</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 dark:bg-gray-700/80">
                        <tr>
                            <th className="p-3"></th>
                            <th className="p-3 font-semibold text-center">2022</th>
                            <th className="p-3 font-semibold text-center">2023</th>
                            <th className="p-3 font-semibold text-center">2024</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        <tr className="bg-white dark:bg-gray-800">
                            <td className="p-3 font-semibold">PL</td>
                            <td className="p-3 text-center">{employee.pl2022 || '-'}</td>
                            <td className="p-3 text-center">{employee.pl2023 || '-'}</td>
                            <td className="p-3 text-center">{employee.pl2024 || '-'}</td>
                        </tr>
                        <tr className="bg-white dark:bg-gray-800">
                            <td className="p-3 font-semibold">TC</td>
                            <td className="p-3 text-center">{employee.tc2022 || '-'}</td>
                            <td className="p-3 text-center">{employee.tc2023 || '-'}</td>
                            <td className="p-3 text-center">{employee.tc2024 || '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const EmployeeProfileCard: React.FC<{ employee: EmployeeProfile }> = ({ employee }) => {
    
    // Dynamically build lists of details to display, only including items with data.
    const keyDetails = [
        { label: "Level", value: employee.level },
        { label: "Grade", value: employee.grade },
        { label: "Employee Subgroup", value: employee.employeeSubgroup },
    ].filter(item => hasValue(item.value));

    const dateDetails = [
        { label: "Start Date", value: employee.startDate },
        { label: "TMT Jabatan", value: employee.tmtJabatan },
        { label: "TMT Tetap", value: employee.tmtTetap },
        { label: "Tanggal Pensiun", value: employee.tanggalPensiun },
        { label: "Masa Kerja", value: employee.masaKerja },
        { label: "Lama Jabatan", value: employee.lamaJabatan },
    ].filter(item => hasValue(item.value));
    
    const organizationalDetails = [
        { label: "Unit Kerja", value: employee.unitKerja },
        { label: "Area", value: employee.area },
        { label: "Kelas Cabang", value: employee.kelasCabang },
    ].filter(item => hasValue(item.value));

    // Check if there are any details to display in the collapsible section
    const hasSubDetails = keyDetails.length > 0 || dateDetails.length > 0 || organizationalDetails.length > 0 || hasValue(employee.pl2022);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700">
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-6">
                <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center font-bold text-3xl text-indigo-600 dark:text-indigo-300 flex-shrink-0 mb-4 sm:mb-0">
                    {((employee.fullName || '').split(' ').map(n => n[0]).join('') || '??').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{employee.fullName || 'Nama Tidak Ditemukan'}</h2>
                    <p className="text-md text-gray-600 dark:text-gray-400">{employee.jabatan || 'Jabatan tidak tersedia'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">NIP: {employee.nip || '-'}</p>
                </div>
            </div>

            {/* --- DETAILS SECTION --- */}
            {hasSubDetails && (
                 <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
                    {/* Key Details */}
                    {keyDetails.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Info Utama</h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-4">
                                {keyDetails.map(item => <DetailItem key={item.label} {...item} />)}
                            </div>
                        </div>
                    )}

                    {/* Organizational Details */}
                    {organizationalDetails.length > 0 && (
                        <div>
                             <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Organisasi</h3>
                             <div className="flex flex-wrap gap-x-6 gap-y-4">
                                {organizationalDetails.map(item => <DetailItem key={item.label} {...item} />)}
                            </div>
                        </div>
                    )}

                    {/* Date Details */}
                    {dateDetails.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Tanggal Penting</h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-4">
                                {dateDetails.map(item => <DetailItem key={item.label} {...item} />)}
                            </div>
                        </div>
                    )}
                    
                    {/* Performance Table */}
                    <PerformanceTable employee={employee} />
                 </div>
            )}
        </div>
    );
};

export default EmployeeProfileCard;
