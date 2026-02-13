import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { ProjectsPage } from "@/components/projects/projects-page";
import { getProjectsByUserId } from "@/lib/projects";

export default async function Projects() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const projects = await getProjectsByUserId(session.user.id);

  return <ProjectsPage projects={projects} />;
}
