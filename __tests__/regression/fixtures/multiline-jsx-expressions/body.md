# Multiline JSX expressions

## A conditional whose branch sits on its own line

{user.plan === "enterprise" ? (
  <Callout theme="info">
    Ask your CSM for a higher limit.
  </Callout>
) : null}

## A list rendered from data

export const regions = ["us", "eu"];

{regions.map(region => (
  <Callout key={region} theme="okay">
    Region {region}
  </Callout>
))}

## A callback body with a blank line between statements

{regions.map(region => {
  const label = region.toUpperCase();

  return <Callout key={region} theme="okay">{label}</Callout>;
})}

## Inline and text results keep their paragraph

{true ? (
  <a href="/reference">API reference</a>
) : null}

{[
  "GET",
  "POST",
].join(" / ")}

## Inside components

<Tabs>
<Tab title="Enterprise">
{user.plan === "enterprise" ? (
  <Callout theme="info">Enterprise tab</Callout>
) : null}
</Tab>
<Tab title="Free">
Nothing here.
</Tab>
</Tabs>

<Accordion title="Regions">
{regions.map(region => (
  <Callout key={region} theme="okay">{region}</Callout>
))}
</Accordion>

<Card>
{true ? (
  <Callout theme="info">Inside a custom component</Callout>
) : null}
</Card>

<Table>
<tr>
<td>
{1 +
1}
</td>
<td>{user.name}</td>
</tr>
</Table>

## Lone variables stay bare

<Callout>
{user.name}
</Callout>

{user.name}
