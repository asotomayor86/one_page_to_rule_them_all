import { redirect } from "next/navigation";

// La raíz siempre lleva al hub; el hub exige sesión y, si no la hay, manda a /login.
export default function Home() {
  redirect("/hub");
}
