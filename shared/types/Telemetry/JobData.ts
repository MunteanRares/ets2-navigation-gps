export interface JobData {
    income: number;
    deadlineTime: string; // ISO date string
    remainingTime: string; // ISO duration-like string
    sourceCity: string;
    sourceCompany: string;
    destinationCity: string;
    destinationCompany: string;
}
