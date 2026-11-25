
import prisma from "./src/config/database.js";

async function checkEmail() {
    const email = await prisma.email.findUnique({
        where: {
            id: "0fab6a21-a710-41a8-8eb6-c8001de62c3f"
        },
        include: {
            recipients: true
        }
    });

    console.log("Email Status:", email?.status);
    console.log("Email Subject:", email?.subject);
    console.log("Recipients:");

    console.table(
        email?.recipients.map(r => ({
            address: r.address,
            status: r.status
        }))
    );

    await prisma.$disconnect();
}

checkEmail();

