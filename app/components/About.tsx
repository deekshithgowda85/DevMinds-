export default function About() {
  return (
    <section id="about" className="py-20 px-6 scroll-mt-20">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">About MultiAgent</h2>
        <p className="text-lg text-gray-300 max-w-3xl mx-auto">
          Built with Next.js, FastAPI, and CrewAI. Three distinct AI agents ensure reliable, explainable code analysis
          without hallucinations. Focus on clarity, speed, and real developer workflows.
        </p>
      </div>
    </section>
  );
}