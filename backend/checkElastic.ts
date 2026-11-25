
import "dotenv/config";
import elasticClient from "./src/config/elasticsearch.js";

async function checkConnection() {
    try {
        const response = await elasticClient.info();

        console.log("Elasticsearch connected successfully!");
        console.log("Cluster Name:", response.cluster_name);
        console.log("Elasticsearch Version:", response.version.number);
    } catch (error) {
        console.error("Elasticsearch connection failed:", error);
    } finally {
        await elasticClient.close();
    }
}

checkConnection();
