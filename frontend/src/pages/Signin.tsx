import { Auth } from "../components/Auth"
import { Quote } from "../components/Quote"

export const Signin = () => {
    return <div>
        <div className="">
            <div>
                <Auth type="signin" />
            </div>
        </div>
    </div>
}