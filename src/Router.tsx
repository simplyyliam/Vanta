import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ImageEditor } from "./components/views";


export function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ImageEditor/>}/>
            </Routes>
        </BrowserRouter>
    )
}