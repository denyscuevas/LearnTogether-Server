import prisma from "../config/prismaClient.ts"
import {DayOfWeek} from "../generated/prisma/enums.ts";
import { faker } from '@faker-js/faker';
import bcrypt from "bcrypt";

// The entire logic related to clearing and seeding the database
async function main() {
    console.log("Emptying existing data...");

    // Deleting all related database tables before seeding
    await prisma.connectionRequest.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.availabilitySlot.deleteMany();
    await prisma.profileTutorCourse.deleteMany();
    await prisma.profileTuteeCourse.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();

    // Giving every user the same password
    const plaintextPassword = "newPassword@123";
    const SEED_PASSWORD_HASH = await bcrypt.hash(plaintextPassword, 10);

    // Getting all Course records in the database
    const allCourses = await prisma.course.findMany();
    if (allCourses.length === 0) {
        throw new Error("No courses found in database");
    }

    // Including the first 100 courses in the seeding to maximize matches
    const focusedCourseIds = allCourses.slice(1, 100).map(c => c.id);

    // Seeding some initial majors and days
    const majors = ['Bachelor of Computer Science (Honours & Co-op)', 'Business Administration (Accounting)', 'Mechanical Engineering', 'Criminology', 'Psychology',
    'Kinesiology', 'Political Science', 'Sociology', 'English', 'B.Sc. Honours Biochemistry', 'Electrical and Computer Engineering', 'B.Sc. Honours Biological Sciences',
    'Collaborative Bachelor of Science in Nursing (BScN)', 'History', 'Bachelor of Mathematics (General and Honours) and Honours Mathematics and Statistics',
    'B.Sc. Honours Physics (and Co-op)'];
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

    // A list of 16 majors to randomly assign
    const profilePictures = [
        "https://res.cloudinary.com/dw1bzsnhe/image/upload/v1771305217/learntogether_profile_pictures/i6lahd0gexddtqfiu5jz.webp",
        "https://res.cloudinary.com/dw1bzsnhe/image/upload/v1773374359/15519_sbs6xq.jpg",
        "https://res.cloudinary.com/dw1bzsnhe/image/upload/v1773374359/15527_xmqhbv.jpg",
        "https://res.cloudinary.com/dw1bzsnhe/image/upload/v1773374359/59335_rrdnrz.jpg"
    ]

    console.log(`Seeding 250 users with password: newPassword@123 ...`);

    // Iterating through each of the 100 to be inserted faker records
    for (let i = 0; i < 250; i++) {

        // Using fakerjs to get two random names to create a user's fullname
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const fullName = `${firstName} ${lastName}`;

        let isTutor = faker.datatype.boolean(0.7);
        let isTutee = faker.datatype.boolean(0.6);

        // Ensuring the user is at least one role
        if (!isTutor && !isTutee) {
            faker.datatype.boolean(0.5) ? (isTutor = true) : (isTutee = true);
        }

        // Adding courses to their lists
        const tutorCoursesData = isTutor
            ? faker.helpers.arrayElements(focusedCourseIds, { min: 1, max: 3 }).map(id => ({
                course: { connect: { id } }
            }))
            : [];

        const tuteeCoursesData = isTutee
            ? faker.helpers.arrayElements(focusedCourseIds, { min: 1, max: 2 }).map(id => ({
                course: { connect: { id } }
            }))
            : [];

        // Creating the records for the user
        await prisma.user.create({
            data: {

                // Creating the User object with the email, password, and TRUE verified status for all
                email: faker.internet.email({ firstName, lastName, provider: 'uwindsor.ca' }).toLowerCase(),
                passwordHash: SEED_PASSWORD_HASH,
                isVerified: true,

                // Creating the Profile object, using faker values for each
                profile: {
                    create: {
                        name: fullName,
                        bio: faker.person.bio(),
                        major: faker.helpers.arrayElement(majors),
                        yearOfStudy: faker.number.int({ min: 1, max: 4 }),
                        isTutor,
                        isTutee,

                        // Creating a collection of 1-3 courses the user can tutor in
                        tutorCourses: {
                            create: tutorCoursesData
                        },

                        // Creating a collection of 1-2 courses the user needs help in
                        tuteeCourses: {
                            create: tuteeCoursesData
                        },

                        // Creating random availability slots, with different day + time combinations and 2-4 total slots
                        availability: {
                            create: faker.helpers.arrayElements(days, { min: 2, max: 4 }).map(day => {
                                const start = faker.helpers.arrayElement([540, 600, 720, 840, 1020]);
                                return {
                                    day: day as DayOfWeek,
                                    startMin: start,
                                    endMin: start + 120
                                };
                            })
                        },
                        profilePicture: faker.helpers.arrayElement(profilePictures)
                    }
                }
            }
        });
    }

    console.log("Seeding complete! 250 users added.");

    // Get all the User objects after seeding
    const allUsers = await prisma.user.findMany();

    console.log("Creating 3 empty threads for each user");

    // Get three users that can be used to make an empty thread with
    for (const user of allUsers) {
        const recipients = faker.helpers.arrayElements(
            allUsers.filter(u => u.id !== user.id),
            3
        );

        // Create three threads with three other users
        for (const recipient of recipients) {
            await prisma.thread.create({
                data: {
                    ThreadParticipant: {
                        create: [
                            { profileId: user.id },
                            { profileId: recipient.id }
                        ]
                    }
                }
            });
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });