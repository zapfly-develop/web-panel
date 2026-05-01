"use client";

import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from "@hello-pangea/dnd";
import type { StoreDelivery } from "@/features/delivery/services/delivery-types";
import type { OrderStatus, StoreOrder } from "../services/order-types";
import {
    buildOrdersByStatus,
    getDeliveryForOrder,
    getOrderStatusLabel,
} from "../services/order-utils";
import { OrderCard } from "./order-card";

type OrdersKanbanBoardProps = {
    orders: StoreOrder[];
    deliveriesByOrderId: Map<string, StoreDelivery>;
    now: Date;
    creatingDeliveryOrderId: string | null;
    onCreateDelivery: (order: StoreOrder) => void;
    onAssignRider: (delivery: StoreDelivery) => void;
    onOpenDetails: (order: StoreOrder) => void;
    onPrint: (order: StoreOrder) => void;
};

const columns: OrderStatus[] = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED"];

export function OrdersKanbanBoard({
    orders,
    deliveriesByOrderId,
    now,
    creatingDeliveryOrderId,
    onCreateDelivery,
    onAssignRider,
    onOpenDetails,
    onPrint,
    onDragEnd,
}: OrdersKanbanBoardProps & { onDragEnd: (result: DropResult) => void }) {
    const ordersByStatus = buildOrdersByStatus(orders);

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="grid lg:min-w-0 lg:grid-cols-4 gap-3">
                    {columns.map((status) => {
                        const columnOrders = ordersByStatus[status];

                        return (
                            <Droppable key={status} droppableId={status}>
                                {(provided, snapshot) => (
                                    <section
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`min-h-72 rounded-md border border-slate-200 p-3 transition-colors ${
                                            snapshot.isDraggingOver
                                                ? "bg-slate-100"
                                                : "bg-slate-50"
                                        }`}
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <h2 className="text-sm font-semibold text-slate-900">
                                                {getOrderStatusLabel(status)}
                                            </h2>
                                            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                                                {columnOrders.length}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {columnOrders.length === 0 ? (
                                                <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-xs text-slate-400">
                                                    Sem pedidos
                                                </div>
                                            ) : (
                                                columnOrders.map(
                                                    (order, index) => (
                                                        <Draggable
                                                            key={order.id}
                                                            draggableId={
                                                                order.id
                                                            }
                                                            index={index}
                                                            isDragDisabled={
                                                                order.status ===
                                                                "DELIVERED"
                                                            }
                                                        >
                                                            {(
                                                                provided,
                                                                snapshot,
                                                            ) => (
                                                                <div
                                                                    ref={
                                                                        provided.innerRef
                                                                    }
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    style={{
                                                                        ...provided
                                                                            .draggableProps
                                                                            .style,
                                                                        opacity:
                                                                            snapshot.isDragging
                                                                                ? 0.8
                                                                                : 1,
                                                                    }}
                                                                >
                                                                    <OrderCard
                                                                        order={
                                                                            order
                                                                        }
                                                                        delivery={getDeliveryForOrder(
                                                                            deliveriesByOrderId,
                                                                            order.id,
                                                                        )}
                                                                        now={
                                                                            now
                                                                        }
                                                                        compact
                                                                        isCreatingDelivery={
                                                                            creatingDeliveryOrderId ===
                                                                            order.id
                                                                        }
                                                                        onCreateDelivery={
                                                                            onCreateDelivery
                                                                        }
                                                                        onAssignRider={
                                                                            onAssignRider
                                                                        }
                                                                        onOpenDetails={
                                                                            onOpenDetails
                                                                        }
                                                                        onPrint={
                                                                            onPrint
                                                                        }
                                                                    />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ),
                                                )
                                            )}
                                            {provided.placeholder}
                                        </div>
                                    </section>
                                )}
                            </Droppable>
                        );
                    })}
                </div>
            </div>
        </DragDropContext>
    );
}
