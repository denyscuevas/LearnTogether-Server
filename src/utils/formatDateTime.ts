// Helper method which allows minutes to be formatted to standard 12H time format
export const formatTime = (mins: number) => {

    // Get the hours, minutes, and AM/PM value for the provided minutes value
    const hours24 = Math.floor(mins / 60);
    const minutes = mins % 60;
    const period = hours24 >= 12 ? 'pm' : 'am';

    // Get the hours value as before 12pm or after 12pm
    const hours12 = hours24 % 12 || 12;

    const formattedMinutes = minutes.toString().padStart(2, '0');

    // Returning the formatted value
    return `${hours12}:${formattedMinutes}${period}`;
};