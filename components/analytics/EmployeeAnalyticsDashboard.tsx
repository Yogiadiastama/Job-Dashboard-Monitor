import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { EmployeeProfile } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

const SHEET_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vT7wdYuXPw-6RCvXKSjK5xMwGLWc3eHYbaqpoY4PYSYm6NJOvCnU7iQUk33yAMtHTeKeD8T-x8Ful2l/pub?gid=0&single=true&output=csv`;

const headerMapping: { [key: string]: keyof EmployeeProfile } = {
    nip: 'nip', fullname: 'fullName', level: 'level', grade: 'grade', startdate: 'startDate',
    employeesubgroup: 'employeeSubgroup', jabatan: 'jabatan', tmtjabatan: 'tmtJabatan',
    lamajabatan: 'lamaJabatan', unitkerja: 'unitKerja', area: 'area', kelascabang: 'kelasCabang',
    tmtmasuk: 'tmtMasuk', 'masakerja(darikontrak)': 'masaKerja', tmtmandiri: 'tmtMandiri',
    tmttetap: 'tmtTetap', usiapensiunpegawai: 'usiaPensiun', tanggalpensiun: 'tanggalPensiun',
    religiousdenominationkey: 'agama', birthdate: 'birthDate', mobilephonelinkaja: 'noHpLinkAja',
    pl2022: 'pl2022', tc2022: 'tc2022', pl2023: 'pl2023', tc2023: 'tc2023', pl2024: 'pl2024',
    tc2024: 'tc2024',
};

const parseSheetData = (csvText: string): EmployeeProfile[] => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s()]+/g, ''));
    const employeeProfiles: EmployeeProfile[] = [];
    const csvRegex = /(?:,|^)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const profile: Partial<EmployeeProfile> = {};
        let match;
        let headerIndex = 0;
        csvRegex.lastIndex = 0;
        while ((match = csvRegex.exec(lines[i])) && headerIndex < headers.length) {
            const csvHeader = headers[headerIndex];
            const profileKey = headerMapping[csvHeader];
            if (profileKey) {
                let value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
                profile[profileKey] = value.trim();
            }
            headerIndex++;
        }
        employeeProfiles.push(profile as EmployeeProfile);
    }
    return employeeProfiles;
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

const ChartCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in-up">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <div style={{ width: '100%', height: 300 }}>
            {children}
        </div>
    </div>
);

const EmployeeAnalyticsDashboard: React.FC = () => {
    const [employeeData, setEmployeeData] = useState<EmployeeProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployeeData = async () => {
            try {
                const response = await fetch(SHEET_URL);
                if (!response.ok) throw new Error(`Gagal mengambil data dari Google Sheet (Status: ${response.status}).`);
                const csvText = await response.text();
                const parsedData = parseSheetData(csvText);
                setEmployeeData(parsedData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
            } finally {
                setLoading(false);
            }
        };
        fetchEmployeeData();
    }, []);

    const analyticsData = useMemo(() => {
        if (employeeData.length === 0) return null;
        
        const countBy = (key: keyof EmployeeProfile) => employeeData.reduce((acc, emp) => {
            const value = emp[key] || 'N/A';
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const levelDistribution = Object.entries(countBy('level')).map(([name, value]) => ({ name, value }));
        const gradeDistribution = Object.entries(countBy('grade')).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        const unitDistribution = Object.entries(countBy('unitKerja')).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const topUnits = unitDistribution.slice(0, 10);

        const ageDistribution = employeeData.reduce((acc, emp) => {
            if (!emp.birthDate || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(emp.birthDate)) return acc;
            const parts = emp.birthDate.split('/');
            const birthDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
            const age = new Date().getFullYear() - birthDate.getFullYear();
            
            let group = '50+';
            if (age < 30) group = '20-29';
            else if (age < 40) group = '30-39';
            else if (age < 50) group = '40-49';
            
            acc[group] = (acc[group] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const ageData = Object.entries(ageDistribution).map(([name, value]) => ({name, value})).sort((a,b) => a.name.localeCompare(b.name));
        
        const tenureDistribution = employeeData.reduce((acc, emp) => {
            const yearsMatch = emp.masaKerja?.match(/(\d+)\s*Tahun/);
            if (!yearsMatch) return acc;
            const years = parseInt(yearsMatch[1], 10);

            let group = '20+ Tahun';
            if (years <= 5) group = '0-5 Tahun';
            else if (years <= 10) group = '6-10 Tahun';
            else if (years <= 15) group = '11-15 Tahun';
            else if (years <= 20) group = '16-20 Tahun';
            
            acc[group] = (acc[group] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const tenureData = Object.entries(tenureDistribution).map(([name, value]) => ({name, value})).sort((a,b) => a.name.localeCompare(b.name));


        return { levelDistribution, gradeDistribution, topUnits, ageData, tenureData };
    }, [employeeData]);
    
    if (loading) return <div className="text-center p-10"><LoadingSpinner text="Memuat data analitik..." /></div>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p className="font-bold">Error</p><p>{error}</p></div>;
    if (!analyticsData) return <p>Tidak ada data untuk ditampilkan.</p>;

    const isDark = document.documentElement.classList.contains('dark');
    const tooltipStyle = { backgroundColor: isDark ? '#374151' : '#fff', border: '1px solid #ccc', borderRadius: '0.5rem' };
    const axisColor = isDark ? '#9CA3AF' : '#6B7280';


    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Distribusi Pegawai per Level">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={analyticsData.levelDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {analyticsData.levelDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>

             <ChartCard title="Jumlah Pegawai per Grade">
                <ResponsiveContainer>
                    <BarChart data={analyticsData.gradeDistribution} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4B5563' : '#E5E7EB'} />
                        <XAxis dataKey="name" tick={{ fill: axisColor }} />
                        <YAxis tick={{ fill: axisColor }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} />
                        <Legend />
                        <Bar dataKey="value" name="Jumlah" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
            
            <div className="lg:col-span-2">
                <ChartCard title="Komposisi Unit Kerja (Top 10)">
                    <ResponsiveContainer>
                        <BarChart data={analyticsData.topUnits} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4B5563' : '#E5E7EB'} />
                            <XAxis type="number" tick={{ fill: axisColor }} />
                            <YAxis dataKey="name" type="category" width={120} tick={{ fill: axisColor, fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} />
                            <Bar dataKey="value" name="Jumlah" fill="#82ca9d" barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <ChartCard title="Distribusi Usia Pegawai">
                <ResponsiveContainer>
                    <BarChart data={analyticsData.ageData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4B5563' : '#E5E7EB'} />
                        <XAxis dataKey="name" tick={{ fill: axisColor }} />
                        <YAxis tick={{ fill: axisColor }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} />
                        <Bar dataKey="value" name="Jumlah" fill="#ffc658" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
            
            <ChartCard title="Distribusi Masa Kerja">
                <ResponsiveContainer>
                    <BarChart data={analyticsData.tenureData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4B5563' : '#E5E7EB'} />
                        <XAxis dataKey="name" tick={{ fill: axisColor }} />
                        <YAxis tick={{ fill: axisColor }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} />
                        <Bar dataKey="value" name="Jumlah" fill="#ff8042" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

        </div>
    );
};

export default EmployeeAnalyticsDashboard;
