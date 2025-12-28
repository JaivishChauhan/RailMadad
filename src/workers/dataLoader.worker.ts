// Web Worker for loading and processing data off the main thread

const ctx = self as any;

ctx.onmessage = async (e: MessageEvent) => {
    const { type, url, kind } = e.data;

    if (type === "LOAD_DATA") {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.status}`);
            }
            const rawData = await response.json();

            let processedData;

            if (kind === 'stations') {
                processedData = rawData.map((station: any) => ({
                    name: station.label,
                    code: station.value
                }));
            } else if (kind === 'trains') {
                processedData = rawData
                    .map((train: any) => ({
                        name: train.train_name,
                        number: train.train_number,
                        zone: train.zone,
                    }))
                    .filter((train: any) => train.number && train.number.trim());
            } else {
                processedData = rawData;
            }

            ctx.postMessage({ type: "SUCCESS", data: processedData, kind });
        } catch (error) {
            ctx.postMessage({ type: "ERROR", error: String(error), kind });
        }
    }
};
