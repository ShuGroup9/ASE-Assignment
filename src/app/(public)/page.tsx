/**
 * @file src/app/(public)/page.tsx
 * @description Public home page.
 * @owner Kuba Gorski (@gitbob2000)
 * @slice Slice1
 */

export default function Home() {
  return (
    <>
      <h1>NOTE!</h1>
      <div className="card">
        <div className="card-body">
          <p>This page can be accessed by anyone.</p>
          <p>This page is rendered on the server for every request (no page caching).</p>
        </div>
      </div>
    </>
  );
}