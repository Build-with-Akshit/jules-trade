async function main() {
  const res = await fetch('http://localhost:3000/api/portfolio?userId=6');
  const data = await res.json();
  console.log(data);
}

main().catch(console.error);
