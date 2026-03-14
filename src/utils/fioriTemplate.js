/**
 * fioriTemplate.js
 *
 * Fallback SAP UI5 XML View shown when AI generation fails.
 *
 * Verified rules applied:
 * - Page uses title="" attribute (no headerToolbar on Page)
 * - xmlns:core declared for core:Item usage
 * - NumericContent indicator uses "Up"/"Down"/"None" only
 * - No data bindings, no event handlers, no controllerName
 * - headerToolbar used only on Table (where it IS valid)
 */
export const fallbackView = `<mvc:View
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:core="sap.ui.core"
  displayBlock="true">
  <Page title="SAP UI5 Builder" showHeader="true">
    <content>
      <VBox class="sapUiContentPadding">

        <MessageStrip
          text="Generation failed or produced invalid XML — please try a different prompt."
          type="Warning"
          showIcon="true"
          class="sapUiSmallMarginBottom"/>

        <Panel headerText="Quick Start" expandable="true" expanded="true" class="sapUiSmallMarginTop">
          <VBox class="sapUiContentPadding">
            <Title text="Welcome to UI5 Builder" level="H3"/>
            <Text
              text="Describe the SAP Fiori screen you want in the prompt panel on the left, then click Generate UI."
              class="sapUiSmallMarginTop"/>
          </VBox>
        </Panel>

        <HBox wrap="Wrap" class="sapUiSmallMarginTop">

          <GenericTile
            header="Sales Dashboard"
            subheader="KPI tiles and orders table"
            class="sapUiSmallMargin">
            <tileContent>
              <TileContent>
                <content>
                  <NumericContent value="1" indicator="Up" valueColor="Good" withMargin="false"/>
                </content>
              </TileContent>
            </tileContent>
          </GenericTile>

          <GenericTile
            header="Registration Form"
            subheader="Inputs and submit button"
            class="sapUiSmallMargin">
            <tileContent>
              <TileContent>
                <content>
                  <NumericContent value="2" indicator="None" valueColor="Neutral" withMargin="false"/>
                </content>
              </TileContent>
            </tileContent>
          </GenericTile>

          <GenericTile
            header="Order List"
            subheader="Search and list items"
            class="sapUiSmallMargin">
            <tileContent>
              <TileContent>
                <content>
                  <NumericContent value="3" indicator="None" valueColor="Neutral" withMargin="false"/>
                </content>
              </TileContent>
            </tileContent>
          </GenericTile>

        </HBox>

        <Table class="sapUiSmallMarginTop">
          <headerToolbar>
            <Toolbar>
              <Title text="Sample Table" level="H2"/>
              <ToolbarSpacer/>
              <SearchField width="200px" placeholder="Search..."/>
            </Toolbar>
          </headerToolbar>
          <columns>
            <Column><Text text="ID"/></Column>
            <Column><Text text="Description"/></Column>
            <Column><Text text="Status"/></Column>
          </columns>
          <items>
            <ColumnListItem>
              <cells>
                <Text text="001"/>
                <Text text="Example record one"/>
                <ObjectStatus text="Active" state="Success"/>
              </cells>
            </ColumnListItem>
            <ColumnListItem>
              <cells>
                <Text text="002"/>
                <Text text="Example record two"/>
                <ObjectStatus text="Pending" state="Warning"/>
              </cells>
            </ColumnListItem>
          </items>
        </Table>

      </VBox>
    </content>
  </Page>
</mvc:View>`;
