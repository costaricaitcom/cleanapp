export interface PropertyForm {
  location: string;
  province: string;
  canton: string;
  square_footage: string;
  number_of_rooms: string;
  number_of_people: string;
  special_cleaning_requirements: string;
}

export const propertyInitialState: PropertyForm = {
  location: "",
  province: "",
  canton: "",
  square_footage: "",
  number_of_rooms: "",
  number_of_people: "",
  special_cleaning_requirements: ""
}; 