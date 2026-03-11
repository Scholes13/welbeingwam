const url = 'http://localhost:3000/api/survey';

console.log(`Fetching ${url}...`);

fetch(url)
    .then(async (res) => {
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log('Body:', text);
    })
    .catch((err) => {
        console.error('Fetch error:', err);
    });
