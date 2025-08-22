
import React from 'react';
import { EmployeeProfile } from '../../types';

const DetailItem: React.FC<{ label: string; value: string | undefined }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-gray-800 dark:text-gray-200">{value || '-'}</p>
    </div>
);

const TMTItem: React.FC<{ label: string, value: string | undefined }> = ({ label, value }) => (
    <div className="flex items-center">
         <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
         <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{value ? `TMT: ${value}` : '-'}</p>
        </div>
    </div>
);

const PerformanceTable: React.FC<{ performanceData: string }> = ({ performanceData }) => {
    const ratings = performanceData.split(',').map(s => s.trim());
    const [pl, tc, cat] = ratings;
    const currentYear = new Date().getFullYear();

    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
            <h3 className="text-md font-bold p-4 bg-gray-200 dark:bg-gray-700">Performance Level</h3>
            <table className="w-full text-sm text-left">
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
                        <td className="p-3 text-center"></td>
                        <td className="p-3 text-center"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const EmployeeProfileCard: React.FC<{ employee: EmployeeProfile }> = ({ employee }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transform transition-all hover:shadow-xl hover:scale-[1.01]">
            {/* Header Section */}
            <div className="flex items-start space-x-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center font-bold text-3xl text-indigo-600 dark:text-indigo-300 flex-shrink-0">
                    {employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{employee.fullName}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 mt-3">
                        <DetailItem label="NIP" value={employee.employeeId} />
                        <DetailItem label="Age" value={employee.age} />
                        <DetailItem label="Grade" value={employee.grade} />
                        <DetailItem label="Grade Range" value={employee.gradeRange} />
                        <DetailItem label="Marital Status" value={employee.maritalStatus} />
                        <DetailItem label="Work Contract" value={employee.workContractType} />
                    </div>
                    <TMTItem label="TMT Grade" value={employee.tmtGrade}/>
                </div>
            </div>

            {/* Body Section */}
            <div className="py-6 border-b border-gray-200 dark:border-gray-700">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <DetailItem label="Bank Mandiri Join Date" value={employee.bankMandiriJoinDate} />
                    <DetailItem label="Permanent Employee Date" value={employee.permanentEmployeeDate} />
                    <DetailItem label="Pension Date" value={employee.pensionDate} />
                </div>
            </div>
            
            <div className="py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Position Details */}
                    <div className="md:col-span-2 space-y-6">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <DetailItem label="Position" value={employee.position}/>
                                <TMTItem label="TMT Posisi" value={employee.tmtLocation}/>
                            </div>
                             <div>
                                <DetailItem label="Organization Unit" value={employee.organizationUnit}/>
                                <DetailItem label="Job Family" value={employee.jobFamily}/>
                             </div>
                             <div>
                                 <DetailItem label="Group" value={employee.group}/>
                                 <TMTItem label="TMT Group" value={employee.tmtGroup}/>
                             </div>
                             <div>
                                <DetailItem label="Directorate" value={employee.directorate}/>
                                <DetailItem label="Location" value={employee.location}/>
                             </div>
                              <div>
                                <DetailItem label="Corporate Title" value={employee.corporateTitle}/>
                                <DetailItem label="Legacy" value={employee.legacy}/>
                             </div>
                         </div>
                         <div className="border-t border-gray-200 dark:border-gray-700 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <DetailItem label="EM (Employee Manager)" value={employee.em}/>
                            <DetailItem label="EMM (Employee Manager Manager)" value={employee.emm}/>
                         </div>
                    </div>
                    
                    {/* Performance Table */}
                    <div className="md:col-span-1">
                        <PerformanceTable performanceData={employee.performanceRating} />
                    </div>
                </div>
            </div>

        </div>
    );
};

export default EmployeeProfileCard;