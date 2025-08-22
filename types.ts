

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

// Updated EmployeeProfile to match the user's specific Google Sheet columns
export interface EmployeeProfile {
    nip: string;
    fullName: string;
    level: string;
    grade: string;
    startDate: string;
    employeeSubgroup: string;
    jabatan: string;
    tmtJabatan: string;
    lamaJabatan: string;
    unitKerja: string;
    area: string;
    kelasCabang: string;
    tmtMasuk: string;
    masaKerja: string;
    tmtMandiri: string;
    tmtTetap: string;
    usiaPensiun: string;
    tanggalPensiun: string;
    agama: string;
    birthDate: string;
    noHpLinkAja: string;
    pl2022: string;
    tc2022: string;
    pl2023: string;
    tc2023: string;
    pl2024: string;
    tc2024: string;
}