# Table nested inside a callout

<Callout icon="🚧" theme="warn">
  **Conflict resolution**

  <Table align={["left","left"]}>
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Result</th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td>Two adapters disagree</td>
        <td>Higher-tier adapter wins</td>
      </tr>

      <tr>
        <td>One adapter reports twice</td>
        <td>Most recent by Last Seen wins</td>
      </tr>
    </tbody>
  </Table>
</Callout>
