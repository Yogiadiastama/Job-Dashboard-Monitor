import React from 'react';
import { EmployeeProfile } from '../../types';

const DetailItem: React.FC<{ label: string; value: string | undefined }> = ({ label, value }) => (
    <div className="min-w-[150px]">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-gray-800 dark:text-gray-200">{value || '-'}</p>
    </div>
);

const TMTItem: React.FC<{ label: string, value: string | undefined }> = ({ label, value }) => (
    <div className="flex items-center mt-1">
         <span className="h-2 w-2 rounded-full bg-green-500 mr-2 flex-shrink-0"></span>
         <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{value ? `TMT: ${value}` : '-'}</p>
        </div>
    </div>
);

const PerformanceTable: React.FC<{ performanceData: string | undefined }> = ({ performanceData }) => {
    // Gracefully handle cases where performanceData might just be commas or empty strings
    const ratings = (performanceData || '').split(',').map(s => s.trim()).filter(Boolean);
    const [pl, tc, cat] = ratings;
    const currentYear = new Date().getFullYear();

    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
            <h3 className="text-md font-bold p-4 bg-gray-200 dark:bg-gray-700">Performance Level</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[300px]">
                    <thead className="bg-gray-100 dark:bg-gray-700/80">
                        <tr>
                            <th className="p-3"></th>
                            <th className="p-3 font-semibold text-center">{currentYear}</th>
                            <th className="p-3 font-semibold text-center">{currentYear - 1}</th>
                            <th className="p-3 font-semibold text-center">{currentYear - 2}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        <tr className="bg-white dark:bg-gray-800">
                            <td className="p-3 font-semibold">PL</td>
                            <td className="p-3 text-center">{pl || '-'}</td>
                            <td className="p-3 text-center">{pl || '-'}</td>
                            <td className="p-3 text-center">{pl || '-'}</td>
                        </tr>
                        <tr className="bg-white dark:bg-gray-800">
                            <td className="p-3 font-semibold">TC</td>
                            <td className="p-3 text-center">{tc || '-'}</td>
                            <td className="p-3 text-center">{tc || '-'}</td>
                            <td className="p-3 text-center">{cat || '-'}</td>
                        </tr>
                        <tr className="bg-white dark:bg-gray-800">
                            <td className="p-3 font-semibold">CAT</td>
                            <td className="p-3 text-center">{cat || '-'}</td>
                            <td className="p-3 text-center">-</td>
                            <td className="p-3 text-center">-</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const EmployeeProfileCard: React.FC<{ employee: EmployeeProfile }> = ({ employee }) => {
    // Helper to check for meaningful data
    const hasValue = (value: string | undefined) => value && value.trim() !== '' && value.trim() !== '-';

    // Prepare data arrays, filtering out any items that don't have a value.
    const primaryDetails = [
        { label: "NIP", value: employee.employeeId },
        { label: "Age", value: employee.age },
        { label: "Grade", value: employee.grade },
        { label: "Grade Range", value: employee.gradeRange },
        { label: "Marital Status", value: employee.maritalStatus },
        { label: "Work Contract", value: employee.workContractType },
    ].filter(item => hasValue(item.value));
    
    const dateDetails = [
        { label: "Bank Mandiri Join Date", value: employee.bankMandiriJoinDate },
        { label: "Permanent Employee Date", value: employee.permanentEmployeeDate },
        { label: "Pension Date", value: employee.pensionDate },
    ].filter(item => hasValue(item.value));

    const organizationalDetails = [
        // Composite items that can have a main value and a TMT value
        { type: 'composite', label: 'Position', value: employee.position, tmtLabel: 'TMT Posisi', tmtValue: employee.tmtLocation },
        { type: 'composite', label: 'Group', value: employee.group, tmtLabel: 'TMT Group', tmtValue: employee.tmtGroup },
        // Simple detail items
        { type: 'simple', label: "Organization Unit", value: employee.organizationUnit },
        { type: 'simple', label: "Job Family", value: employee.jobFamily },
        { type: 'simple', label: "Directorate", value: employee.directorate },
        { type: 'simple', label: "Location", value: employee.location },
        { type: 'simple', label: "Corporate Title", value: employee.corporateTitle },
        { type: 'simple', label: "Legacy", value: employee.legacy },
    ].filter(item => hasValue(item.value) || (item.type === 'composite' && hasValue(item.tmtValue)));

    const managerDetails = [
        { label: "EM (Employee Manager)", value: employee.em },
        { label: "EMM (Employee Manager Manager)", value: employee.emm },
    ].filter(item => hasValue(item.value));

    const hasPerformanceData = hasValue(employee.performanceRating);

    const hasAnySubDetails = dateDetails.length > 0 || organizationalDetails.length > 0 || managerDetails.length > 0 || hasPerformanceData;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transform transition-all hover:shadow-xl hover:scale-[1.01]">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:space-x-6 pb-6">
                <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center font-bold text-3xl text-indigo-600 dark:text-indigo-300 flex-shrink-0 mb-4 sm:mb-0">
                    {((employee.fullName || '').split(' ').map(n => n[0]).join('') || '??').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{employee.fullName || 'Nama Tidak Ditemukan'}</h2>
                    {primaryDetails.length > 0 && (
                        <div className="flex flex-wrap gap-x-6 gap-y-4 mt-3">
                            {primaryDetails.map(item => <DetailItem key={item.label} {...item} />)}
                        </div>
                    )}
                    {hasValue(employee.tmtGrade) && <div className="mt-2"><TMTItem label="TMT Grade" value={employee.tmtGrade}/></div>}
                </div>
            </div>

            {/* Render sub-details only if there's anything to show */}
            {hasAnySubDetails && (
                <div className="space-y-6">
                    {dateDetails.length > 0 && (
                        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                             <div className="flex flex-wrap gap-6">
                                {dateDetails.map(item => <DetailItem key={item.label} {...item} />)}
                            </div>
                        </div>
                    )}
                    
                    {(organizationalDetails.length > 0 || managerDetails.length > 0 || hasPerformanceData) && (
                        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {(organizationalDetails.length > 0 || managerDetails.length > 0) && (
                                    <div className="md:col-span-2 space-y-6">
                                        {organizationalDetails.length > 0 && (
                                            <div className="flex flex-wrap gap-6">
                                                {organizationalDetails.map(item => (
                                                    <div key={item.label}>
                                                        {hasValue(item.value) && <DetailItem label={item.label} value={item.value} />}
                                                        {item.type === 'composite' && hasValue(item.tmtValue) && <TMTItem label={item.tmtLabel} value={item.tmtValue} />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {managerDetails.length > 0 && (
                                            <div className={`${organizationalDetails.length > 0 ? 'border-t border-gray-200 dark:border-gray-700 pt-6' : ''} flex flex-wrap gap-6`}>
                                                {managerDetails.map(item => <DetailItem key={item.label} {...item} />)}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {hasPerformanceData && (
                                    <div className={`md:col-span-1 ${organizationalDetails.length === 0 && managerDetails.length === 0 ? 'md:col-start-2' : ''}`}>
                                        <PerformanceTable performanceData={employee.performanceRating} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployeeProfileCard;
