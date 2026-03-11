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

// Helper method that allows 12h time formats to be converted back to minute values
export const timeToMinutes = (timeStr: string): number => {
    // Expected format: "02:30 PM" or "2:30 PM"
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time!.split(':').map(Number);

    if (modifier === 'PM' && hours! < 12) {
        hours! += 12;
    }
    if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }

    return (hours! * 60) + minutes!;
};