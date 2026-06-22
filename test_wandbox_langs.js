async function getCompilers() {
    try {
        const response = await fetch('https://wandbox.org/api/list.json');
        const data = await response.json();
        const kotlin = data.filter(c => c.language === 'Kotlin');
        const dart = data.filter(c => c.language.toLowerCase() === 'dart');
        const swift = data.filter(c => c.language === 'Swift');
        
        console.log('Kotlin Compilers:', kotlin.map(k => k.name));
        console.log('Dart Compilers:', dart.map(d => d.name));
    } catch(err) {
        console.error(err);
    }
}
getCompilers();
