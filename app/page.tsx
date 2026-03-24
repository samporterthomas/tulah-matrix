import dynamic from "next/dynamic";

const MatrixAnalyser = dynamic(
  () => import("@/components/MatrixAnalyser"),
  { ssr: false }
);

export default function Home() {
  return <MatrixAnalyser />;
}
