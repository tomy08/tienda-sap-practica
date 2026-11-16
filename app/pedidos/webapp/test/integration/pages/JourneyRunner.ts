import JourneyRunner from "sap/fe/test/JourneyRunner";
import ListReport from "sap/fe/test/ListReport";
import ObjectPage from "sap/fe/test/ObjectPage";
import CustomPedidosListGenerated from "./PedidosList.gen";
import CustomPedidosObjectPageGenerated from "./PedidosObjectPage.gen";

const runner = new JourneyRunner({
    launchUrl: sap.ui.require.toUrl("pedidos") + "/test/flp.html#app-preview",
    pages: {
        onThePedidosListGenerated: new ListReport(
            {
                appId: "pedidos",
                componentId: "PedidosList",
                entitySet: "",
                contextPath: "/Pedidos"
            },
            CustomPedidosListGenerated
        ),
        onThePedidosObjectPageGenerated: new ObjectPage(
            {
                appId: "pedidos",
                componentId: "PedidosObjectPage",
                entitySet: "",
                contextPath: "/Pedidos"
            },
            CustomPedidosObjectPageGenerated
        )
    },
    async: true
});

export default runner;
