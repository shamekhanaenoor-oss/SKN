export type Category = "students" | "staff" | "drivers";

export interface Person {
  id: string;
  category: Category;
  idNumber?: string;
  name: string;
  fatherName: string;
  surname?: string; // تخلص
  className?: string; // صنف (for students) or position
  transport?: string;
  parentPhone?: string;
  issueDate?: string;
  expiryDate?: string;
  photo?: string; // dataURL
  // staff
  position?: string;
  department?: string;
  // drivers
  vehicleNumber?: string;
  licenseNumber?: string;
  route?: string;
  // shared phone (staff/drivers)
  phone?: string;
}

export interface CardField {
  id: string;
  key: keyof Person | "photo";
  label: string;
  x: number; // percent 0-100
  y: number;
  fontSize: number;
  color: string;
  fontWeight: number;
  width?: number; // for photo, percent
  height?: number;
  align: "left" | "center" | "right";
  photoShape?: "circle" | "rect"; // for photo field only
}

export interface CardSide {
  background?: string;
  fields: CardField[];
}

export interface CardTemplate {
  background?: string;
  width: number;
  height: number;
  fields: CardField[];
  back?: CardSide;
}

export interface AppState {
  people: Person[];
  template: CardTemplate; // legacy / fallback
  templates?: Partial<Record<Category, CardTemplate>>;
  codeSettings?: Partial<Record<Category, string>>;
  lang: "fa" | "en";
}
