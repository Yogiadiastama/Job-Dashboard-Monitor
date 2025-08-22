
export type UserRole = 'pegawai' | 'pimpinan' | 'admin';
export type TaskStatus = 'Pending' | 'On Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Mid' | 'High';

export interface UserData {
  id: string;
  uid: string;
  nama: string;
  email: string;
  noWhatsapp: string;
  role: UserRole;
  photoURL?: string;
}

export interface Task {
  id:string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  fileUrl?: string;
  rating?: number;
  createdAt?: string; // YYYY-MM-DDTHH:mm:ss.sssZ format
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  description: string;
  createdBy: string; // User UID
}

export interface ThemeSettings {
  headerTitle: string;
  accentColor: string;
  loginBgUrl: string;
}

// New types for the Training Dashboard
export type TrainingStatus = 'Belum Dikonfirmasi' | 'Terkonfirmasi' | 'Menunggu Jawaban';

export const ALL_STATUSES: TrainingStatus[] = ['Belum Dikonfirmasi', 'Terkonfirmasi', 'Menunggu Jawaban'];

export interface Training {
  id: string;
  nama: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  lokasi: string;
  pic: string;
  catatan: string;
  status: TrainingStatus;
}

// New type for Employee Search from Google Sheets
export interface EmployeeProfile {
    employeeId: string;
    fullName: string;
    gender: string;
    age: string;
    email: string;
    position: string;
    joinDate: string;
    performanceRating: string; // e.g., "PL2, CR, HIPO"
    grade: string;
    gradeRange: string;
    tmtGrade: string;
    maritalStatus: string;
    workContractType: string;
    bankMandiriJoinDate: string;
    permanentEmployeeDate: string;
    pensionDate: string;
    organizationUnit: string;
    group: string;
    tmtGroup: string;
    corporateTitle: string;
    jobFamily: string;
    directorate: string;
    legacy: string;
    location: string;
    tmtLocation: string;
    em: string;
    emm: string;
}