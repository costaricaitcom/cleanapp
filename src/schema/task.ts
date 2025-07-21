export interface TaskForm {
  property_id: string;
  service_type: string;
  scheduled_date: string;
  end_date: string;
  status: string;
  duration_days: string;
  notes: string;
  assigned_to: string[];
}

export const taskInitialState: TaskForm = {
  property_id: "",
  service_type: "",
  scheduled_date: "",
  end_date: "",
  status: "pending",
  duration_days: "",
  notes: "",
  assigned_to: []
}; 