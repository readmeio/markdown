# Variables in inline HTML

<span>Inline: <<companyName>></span>

<div><<companyName>></div>

<p><<companyName>></p>

<h3><<companyName>></h3>

<div>{user.companyName}</div>

<p>Plan: {user.planName}</p>

<div>**bold** and <<companyName>></div>

<div style="color: red"><<companyName>></div>

<div>{ color: red }</div>

<div>{1 + 1}</div>

## Wrapper layouts

<div><<companyName>>
</div>

<div><<companyName>>

</div>

<div>
<<companyName>>
</div>

<div>
    <<companyName>>
</div>

## Bigger trees

<div class="card"><h4><<companyName>></h4><p>Plan: {user.planName}</p><ul><li><<companyName>></li></ul></div>

<div><section><ul><li><<companyName>></li></ul></section></div>

## Wrapped in HTML inside a component

<Callout theme="info">
  <div><<companyName>></div>
</Callout>

<Callout theme="info"><div>{user.companyName}</div></Callout>
