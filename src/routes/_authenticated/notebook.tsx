import { createFileRoute } from "@tanstack/react-router";
import { useReader } from "@/hooks/use-reader";
import { Notebook } from "@/components/koa/Notebook";
import { Loading, ErrorNotice, PageTitle } from "@/components/koa/UI";
import { userError } from "@/lib/koa-data";
export const Route = createFileRoute("/_authenticated/notebook")({
  validateSearch: (s: Record<string, unknown>): { book?: string } => ({
    book: typeof s.book === "string" ? s.book : undefined,
  }),
  head: () => ({
    meta: [{ title: "Mi cuaderno — Lee con Koa" }, { name: "robots", content: "noindex" }],
  }),
  component: NotebookPage,
});
function NotebookPage() {
  const { data: books = [], isLoading, error } = useReader();
  const { book } = Route.useSearch();
  if (isLoading) return <Loading />;
  return (
    <>
      <PageTitle eyebrow="Las palabras que se quedan" title="Tu cuaderno de lectura">
        Citas, ideas y pequeños descubrimientos. Solo tuyos.
      </PageTitle>
      {error ? (
        <ErrorNotice>{userError(error)}</ErrorNotice>
      ) : (
        <Notebook books={books} initialBook={book} />
      )}
    </>
  );
}
