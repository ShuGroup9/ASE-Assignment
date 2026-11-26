/**
 * @file src/app/(internal)/admin/page.tsx
 * @description Internal admin page.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 */

export default function Home() {
  return (
    <>
      <h1>NOTE!</h1>
      <div className="card">
        <div className="card-body">
          <p>This page is will be for authenticated administrators only.</p>
          <p>This page is rendered on the server for every request (no page caching).</p>
        </div>
      </div>
    </>
  );
}
