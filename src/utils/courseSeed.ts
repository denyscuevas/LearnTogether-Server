import prisma from "../config/prismaClient.ts";
import fs from "node:fs";
import path from "node:path";

// Structure of each Course object
type CourseJson = { code: string; name: string };

// Reading the JSON file
async function main() {
    const filePath = path.join(process.cwd(), "src", "utils", "courses.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const courses: CourseJson[] = JSON.parse(raw);

    // Creating the courses for each JSON object, and adding to the database
    await prisma.course.createMany({
        data: courses.map((course) => ({
            code: course.code, name: course.name })),
        skipDuplicates: true,
    });

    console.log(`Seeded Courses`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
