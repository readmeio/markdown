# Postman Run Button

Add a "Run in Postman" button to your documentation, allowing users to fork a Postman collection. This component is a dupe of [the version in our Marketplace](https://github.com/readmeio/marketplace/tree/main/components/PostmanRunButton) so our users can easily insert it via the editor.

### Usage

```mdx
<Postman
  collectionId="123456-abcd-efgh-ijkl" 
  collectionUrl="entityId=123456-abcd-efgh-ijkl&entityType=collection&workspaceId=abcdef-1234-5678"
/>
```

### How to Find Your Collection ID and URL

1. Open your collection in Postman
2. Click "Share" button at the top right of your collection
3. Go to the "Via API" tab
4. You'll find your Collection ID in the URL or in the API response
5. The Collection URL contains parameters after the main URL (starting with `entityId=`)

### Props

- **`collectionId`**: (required) the ID of your Postman collection (e.g. `"123456-abcd-efgh-ijkl"`)
- **`collectionUrl`**: (required) the URL parameters for your collection, typically in this format:
  ```
  entityId=YOUR_COLLECTION_ID&entityType=collection&workspaceId=YOUR_WORKSPACE_ID
  ```
